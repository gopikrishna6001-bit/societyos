-- Committee / platform admin can verify payment proofs and record the matching collection.

CREATE OR REPLACE FUNCTION public.record_collection(
  p_demand uuid,
  p_amount numeric,
  p_paid_on date,
  p_mode text,
  p_bank_reference text,
  p_receipt_number text,
  p_key text,
  p_bank_account uuid,
  p_fund_account uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.maintenance_demands%ROWTYPE;
  v_entry uuid;
  v_id uuid;
  v_outstanding numeric(14,2);
BEGIN
  SELECT * INTO v_demand FROM public.maintenance_demands WHERE id = p_demand FOR UPDATE;
  IF v_demand.id IS NULL THEN
    RAISE EXCEPTION 'demand not found';
  END IF;
  IF NOT private.has_role(v_demand.community_id, ARRAY['treasurer', 'committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_outstanding FROM public.collections WHERE demand_id = p_demand;
  v_outstanding := v_demand.expected_amount + v_demand.additional_amount - v_outstanding;
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'collection exceeds the outstanding demand';
  END IF;

  v_entry := private.post_journal(
    v_demand.community_id,
    'receipt',
    p_paid_on,
    'Maintenance receipt ' || p_receipt_number,
    p_key,
    jsonb_build_array(
      jsonb_build_object('account_id', p_bank_account, 'direction', 'debit', 'amount', p_amount),
      jsonb_build_object('account_id', p_fund_account, 'direction', 'credit', 'amount', p_amount)
    ),
    NULL
  );

  INSERT INTO public.collections (
    community_id, demand_id, amount, paid_on, payment_mode, bank_reference,
    receipt_number, journal_entry_id, idempotency_key, recorded_by
  ) VALUES (
    v_demand.community_id, p_demand, p_amount, p_paid_on, p_mode, NULLIF(p_bank_reference, ''),
    p_receipt_number, v_entry, p_key, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_id FROM public.collections
    WHERE community_id = v_demand.community_id AND idempotency_key = p_key;
    IF v_id IS NULL THEN
      RAISE;
    END IF;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_payment_proof(
  p_proof uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL,
  p_receipt_number text DEFAULT NULL,
  p_bank_account uuid DEFAULT NULL,
  p_fund_account uuid DEFAULT NULL,
  p_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proof public.payment_proofs%ROWTYPE;
  v_collection uuid;
  v_key text;
BEGIN
  SELECT * INTO v_proof FROM public.payment_proofs WHERE id = p_proof FOR UPDATE;
  IF v_proof.id IS NULL THEN
    RAISE EXCEPTION 'proof not found';
  END IF;
  IF NOT private.has_role(v_proof.community_id, ARRAY['treasurer', 'committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_proof.status <> 'pending' THEN
    RAISE EXCEPTION 'proof already reviewed';
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.payment_proofs
    SET status = 'rejected',
        rejection_reason = COALESCE(NULLIF(btrim(p_rejection_reason), ''), 'Rejected by committee'),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_proof;
    INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
    VALUES (
      v_proof.community_id, v_proof.submitted_by, 'payment_proof_rejected',
      'Payment proof rejected',
      COALESCE(NULLIF(btrim(p_rejection_reason), ''), 'Your payment proof was rejected. Please resubmit.')
    );
    RETURN p_proof;
  END IF;

  IF p_decision <> 'verified' THEN
    RAISE EXCEPTION 'decision must be verified or rejected';
  END IF;
  IF p_bank_account IS NULL OR p_fund_account IS NULL THEN
    RAISE EXCEPTION 'bank and fund accounts required to verify';
  END IF;
  IF NULLIF(btrim(p_receipt_number), '') IS NULL THEN
    RAISE EXCEPTION 'receipt number required';
  END IF;

  v_key := COALESCE(NULLIF(btrim(p_key), ''), 'proof:' || p_proof::text);
  v_collection := public.record_collection(
    v_proof.demand_id,
    v_proof.amount,
    v_proof.paid_on,
    v_proof.payment_mode,
    v_proof.bank_reference,
    btrim(p_receipt_number),
    v_key,
    p_bank_account,
    p_fund_account
  );

  UPDATE public.payment_proofs
  SET status = 'verified',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      collection_id = v_collection,
      rejection_reason = NULL
  WHERE id = p_proof;

  INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
  VALUES (
    v_proof.community_id, v_proof.submitted_by, 'payment_proof_verified',
    'Payment verified',
    'Your payment proof was verified. Receipt ' || btrim(p_receipt_number) || '.'
  );

  RETURN p_proof;
END;
$$;
