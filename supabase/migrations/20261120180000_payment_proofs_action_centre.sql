-- Payment proof workflow + action centre helpers.
-- Additive. Does not post ledger until treasurer verifies via record_collection.
-- Apply only with approval on hosted; test on disposable DB first.

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  demand_id uuid NOT NULL REFERENCES public.maintenance_demands(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL DEFAULT 'upi',
  bank_reference text,
  storage_bucket text NOT NULL DEFAULT 'community-originals',
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  notes text,
  rejection_reason text,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  collection_id uuid REFERENCES public.collections(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, demand_id, storage_path)
);

CREATE INDEX IF NOT EXISTS payment_proofs_community_status_idx
  ON public.payment_proofs (community_id, status, created_at DESC);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_proofs_read ON public.payment_proofs;
CREATE POLICY payment_proofs_read ON public.payment_proofs FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
  OR submitted_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.maintenance_demands d
    WHERE d.id = payment_proofs.demand_id
      AND private.occupies(d.unit_id)
  )
);

REVOKE ALL ON public.payment_proofs FROM PUBLIC, anon;
GRANT SELECT ON public.payment_proofs TO authenticated;

-- Resident: list my unit demands with outstanding amounts.
CREATE OR REPLACE FUNCTION public.my_unit_demands(p_community uuid)
RETURNS TABLE (
  demand_id uuid,
  period_id uuid,
  unit_id uuid,
  unit_number text,
  period_month date,
  financial_year text,
  expected_amount numeric,
  additional_amount numeric,
  collected_amount numeric,
  outstanding_amount numeric,
  due_on date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT
    d.id,
    d.period_id,
    d.unit_id,
    u.number,
    p.period_month,
    p.financial_year,
    d.expected_amount,
    d.additional_amount,
    COALESCE(SUM(c.amount), 0)::numeric(14,2),
    (d.expected_amount + d.additional_amount - COALESCE(SUM(c.amount), 0))::numeric(14,2),
    p.due_on
  FROM public.maintenance_demands d
  JOIN public.units u ON u.id = d.unit_id
  JOIN public.collection_periods p ON p.id = d.period_id
  LEFT JOIN public.collections c ON c.demand_id = d.id
  WHERE d.community_id = p_community
    AND private.occupies(d.unit_id)
  GROUP BY d.id, d.period_id, d.unit_id, u.number, p.period_month, p.financial_year,
           d.expected_amount, d.additional_amount, p.due_on
  ORDER BY p.period_month DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.my_unit_demands(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_unit_demands(uuid) TO authenticated;

-- Submit proof: does NOT post ledger.
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_demand uuid,
  p_amount numeric,
  p_paid_on date,
  p_mode text,
  p_bank_reference text,
  p_storage_path text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.maintenance_demands%ROWTYPE;
  v_outstanding numeric(14,2);
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO v_demand FROM public.maintenance_demands WHERE id = p_demand;
  IF v_demand.id IS NULL THEN
    RAISE EXCEPTION 'demand not found';
  END IF;
  IF NOT private.occupies(v_demand.unit_id)
     AND NOT private.has_role(v_demand.community_id, ARRAY['treasurer', 'committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount required';
  END IF;
  IF NULLIF(btrim(p_storage_path), '') IS NULL THEN
    RAISE EXCEPTION 'proof storage path required';
  END IF;
  IF split_part(p_storage_path, '/', 1) IS DISTINCT FROM v_demand.community_id::text THEN
    RAISE EXCEPTION 'storage path must start with community id';
  END IF;

  SELECT v_demand.expected_amount + v_demand.additional_amount - COALESCE(SUM(c.amount), 0)
  INTO v_outstanding
  FROM public.collections c
  WHERE c.demand_id = p_demand;
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'amount exceeds outstanding demand';
  END IF;

  INSERT INTO public.payment_proofs (
    community_id, demand_id, amount, paid_on, payment_mode, bank_reference,
    storage_path, notes, submitted_by, status
  ) VALUES (
    v_demand.community_id, p_demand, p_amount, COALESCE(p_paid_on, CURRENT_DATE),
    COALESCE(NULLIF(btrim(p_mode), ''), 'upi'), NULLIF(btrim(p_bank_reference), ''),
    btrim(p_storage_path), NULLIF(btrim(p_notes), ''), auth.uid(), 'pending'
  )
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
  SELECT v_demand.community_id, m.profile_id, 'payment_proof_submitted',
         'Payment proof awaiting verification',
         'A resident submitted payment proof for verification.'
  FROM public.community_memberships m
  WHERE m.community_id = v_demand.community_id
    AND m.status = 'active'
    AND m.role IN ('treasurer', 'committee_admin', 'platform_admin');

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text)
  TO authenticated;

-- Treasurer: reject or verify. Verify posts collection (ledger) with idempotency.
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
  IF NOT private.has_role(v_proof.community_id, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_proof.status <> 'pending' THEN
    RAISE EXCEPTION 'proof already reviewed';
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.payment_proofs
    SET status = 'rejected',
        rejection_reason = COALESCE(NULLIF(btrim(p_rejection_reason), ''), 'Rejected by treasurer'),
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

REVOKE ALL ON FUNCTION public.review_payment_proof(uuid, text, text, text, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(uuid, text, text, text, uuid, uuid, text)
  TO authenticated;

-- Unified action centre payload for the signed-in member.
CREATE OR REPLACE FUNCTION public.action_centre(p_community uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- My open concerns.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'module', 'concerns',
    'title', t.ticket_number || ': ' || t.subject,
    'status', t.status,
    'due_on', NULL,
    'action', 'Open concern',
    'page', 'concerns'
  ) ORDER BY t.updated_at DESC), '[]'::jsonb)
  INTO v_items
  FROM public.tickets t
  WHERE t.community_id = p_community
    AND t.created_by = auth.uid()
    AND t.status NOT IN ('closed', 'rejected');

  -- Treasurer: pending payment proofs.
  IF private.has_role(p_community, ARRAY['treasurer']) THEN
    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'module', 'payments',
        'title', 'Verify payment proof · ' || to_char(p.amount, 'FM9999990.00'),
        'status', p.status,
        'due_on', p.paid_on,
        'action', 'Review proof',
        'page', 'collections'
      ) ORDER BY p.created_at)
      FROM public.payment_proofs p
      WHERE p.community_id = p_community AND p.status = 'pending'
    ), '[]'::jsonb);
  END IF;

  -- Committee: open unassigned/in-progress public concerns needing attention.
  IF private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'module', 'concerns',
        'title', 'Committee: ' || t.ticket_number || ' · ' || t.subject,
        'status', t.status,
        'due_on', NULL,
        'action', 'Update status',
        'page', 'concerns'
      ) ORDER BY t.updated_at DESC)
      FROM public.tickets t
      WHERE t.community_id = p_community
        AND t.status IN ('open', 'assigned', 'in_progress', 'awaiting_resident', 'on_hold')
      LIMIT 20
    ), '[]'::jsonb);

    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'module', 'expenses',
        'title', 'Expense awaiting decision · ' || e.expense_number,
        'status', e.approval_status,
        'due_on', e.occurred_on,
        'action', 'Decide',
        'page', 'expenses'
      ))
      FROM public.expenses e
      WHERE e.community_id = p_community AND e.approval_status = 'pending'
    ), '[]'::jsonb);
  END IF;

  -- Resident: outstanding dues.
  v_items := v_items || COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.demand_id,
      'module', 'payments',
      'title', 'Outstanding dues · unit ' || d.unit_number || ' · ' || to_char(d.outstanding_amount, 'FM9999990.00'),
      'status', 'outstanding',
      'due_on', d.due_on,
      'action', 'Pay / submit proof',
      'page', 'finance'
    ))
    FROM public.my_unit_demands(p_community) d
    WHERE d.outstanding_amount > 0
  ), '[]'::jsonb);

  -- Upcoming meetings for all members.
  v_items := v_items || COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', m.id,
      'module', 'meetings',
      'title', 'Meeting: ' || m.title,
      'status', 'scheduled',
      'due_on', m.held_on::date,
      'action', 'Open meetings',
      'page', 'decisions'
    ))
    FROM (
      SELECT id, title, held_on FROM public.meetings
      WHERE community_id = p_community AND held_on >= now()
      ORDER BY held_on LIMIT 5
    ) m
  ), '[]'::jsonb);

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.action_centre(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.action_centre(uuid) TO authenticated;
