-- Richer payment-proof alerts + surface proofs for committee in action centre
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
  v_unit text;
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

  SELECT number INTO v_unit FROM public.units WHERE id = v_demand.unit_id;

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
         'New payment proof · Flat ' || COALESCE(v_unit, '?'),
         '₹' || to_char(p_amount, 'FM999999990.00') || ' via ' || COALESCE(NULLIF(btrim(p_mode), ''), 'upi')
           || ' · open Accounts → Collect dues to confirm.'
  FROM public.community_memberships m
  WHERE m.community_id = v_demand.community_id
    AND m.status = 'active'
    AND m.role IN ('treasurer', 'committee_admin', 'platform_admin');

  RETURN v_id;
END;
$$;
