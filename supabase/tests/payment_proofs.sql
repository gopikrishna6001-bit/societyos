-- Requires ledger_rls.sql helpers and seed users.

SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid;
  v_unit uuid;
  v_period uuid;
  v_demand uuid;
  v_bank uuid;
  v_fund uuid;
  v_proof uuid;
  v_count integer;
BEGIN
  SELECT value::uuid INTO v_community FROM public._test_ctx WHERE key = 'community';
  IF v_community IS NULL THEN
    RAISE EXCEPTION 'payment_proofs: community missing from ledger seed';
  END IF;

  SELECT id INTO v_unit FROM public.units WHERE community_id = v_community AND number = '101' LIMIT 1;
  SELECT id INTO v_period FROM public.collection_periods WHERE community_id = v_community ORDER BY period_month DESC LIMIT 1;
  IF v_period IS NULL THEN
    -- open a period as treasurer (asha is admin; meera is resident occupying 101)
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
    SET ROLE authenticated;
    v_period := public.open_collection_period(v_community, '2026-27', '2026-11-01', '2026-11-10', 1000);
  END IF;

  -- Prefer an unpaid demand for unit 101; otherwise open a fresh period as treasurer.
  SELECT d.id INTO v_demand
  FROM public.maintenance_demands d
  LEFT JOIN public.collections c ON c.demand_id = d.id
  WHERE d.community_id = v_community AND d.unit_id = v_unit
  GROUP BY d.id, d.expected_amount, d.additional_amount
  HAVING d.expected_amount + d.additional_amount - COALESCE(SUM(c.amount), 0) > 0
  LIMIT 1;

  IF v_demand IS NULL THEN
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
    SET ROLE authenticated;
    v_period := public.open_collection_period(v_community, '2026-27', '2026-12-01', '2026-12-10', 750);
    SELECT id INTO v_demand FROM public.maintenance_demands
    WHERE community_id = v_community AND unit_id = v_unit AND period_id = v_period;
  END IF;
  IF v_demand IS NULL THEN
    RAISE EXCEPTION 'payment_proofs: demand for unit 101 missing';
  END IF;

  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
  SET ROLE authenticated;

  SELECT count(*) INTO v_count FROM public.my_unit_demands(v_community);
  PERFORM public._assert(v_count >= 1, 'meera sees unit demands');

  v_proof := public.submit_payment_proof(
    v_demand, 50, CURRENT_DATE, 'upi', 'UPI123',
    v_community::text || '/payment-proofs/demo.pdf', 'test proof'
  );
  PERFORM public._assert(v_proof IS NOT NULL, 'proof submitted');
  PERFORM public._assert(
    (SELECT status FROM public.payment_proofs WHERE id = v_proof) = 'pending',
    'proof stays pending without ledger post'
  );

  -- Resident cannot verify.
  BEGIN
    PERFORM public.review_payment_proof(v_proof, 'verified', NULL, 'R-1', NULL, NULL, NULL);
    RAISE EXCEPTION 'resident must not verify proofs';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%not authorized%' THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
  SET ROLE authenticated;

  SELECT id INTO v_bank FROM public.accounts WHERE community_id = v_community AND account_type = 'bank' LIMIT 1;
  SELECT id INTO v_fund FROM public.accounts WHERE community_id = v_community AND account_type = 'fund' LIMIT 1;

  PERFORM public.review_payment_proof(
    v_proof, 'verified', NULL, 'RCP-PROOF-1', v_bank, v_fund, 'proof:' || v_proof::text
  );
  PERFORM public._assert(
    (SELECT status FROM public.payment_proofs WHERE id = v_proof) = 'verified',
    'treasurer verification posts'
  );
  PERFORM public._assert(
    (SELECT collection_id FROM public.payment_proofs WHERE id = v_proof) IS NOT NULL,
    'collection linked'
  );

  PERFORM public.action_centre(v_community);
END $$;

RESET ROLE;
SELECT 'payment proof assertions passed' AS result;
