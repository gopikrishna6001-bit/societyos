-- Auditor observations, settings update, gateway boundary, assistant facts.
-- Seed roles after ledger_rls: asha=committee, leela=treasurer, ravi=elected auditor, meera=resident.

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid;
  v_obs uuid;
  v_staff uuid;
  v_facts jsonb;
  v_seats integer;
BEGIN
  SELECT value::uuid INTO v_community FROM public._test_ctx WHERE key = 'community';
  IF v_community IS NULL THEN
    RAISE EXCEPTION 'governance_ops: community missing from ledger seed';
  END IF;

  PERFORM public.update_community_settings(
    v_community, 5000, 25000, 12, 2, 2, 55, 'unit'
  );
  SELECT auditor_seats INTO v_seats FROM public.community_settings WHERE community_id = v_community;
  IF v_seats <> 2 THEN RAISE EXCEPTION 'auditor seats not updated'; END IF;

  PERFORM public.configure_payment_gateway(v_community, false, NULL, 'unconfigured', false);

  INSERT INTO public.community_staff (community_id, full_name, role_title)
  VALUES (v_community, 'Ravi Guard', 'Security')
  RETURNING id INTO v_staff;
  PERFORM public.mark_staff_attendance(v_staff, CURRENT_DATE, 'present', 'morning');

  INSERT INTO public.community_assets (community_id, name, category, status)
  VALUES (v_community, 'Lift A', 'lift', 'operational');

  -- Elected auditor (ravi) raises observation.
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  SET ROLE authenticated;

  v_obs := public.raise_audit_observation(
    v_community, 'Bank variance check', 'Please clarify the November variance.', 'bank', NULL
  );

  -- Treasurer (leela) responds.
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
  SET ROLE authenticated;
  PERFORM public.respond_audit_observation(v_obs, 'Variance matches pending cheque clearance.');

  -- Auditor closes.
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  SET ROLE authenticated;
  PERFORM public.resolve_audit_observation(v_obs, 'resolved', 'Accepted');

  v_facts := public.society_assistant_facts(v_community);
  IF (v_facts->>'verified')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'assistant facts missing verified flag';
  END IF;
  IF NOT (v_facts ? 'pending_expenses') THEN
    RAISE EXCEPTION 'auditor should see financial facts';
  END IF;

  -- Resident (meera) gets restricted financial detail.
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
  SET ROLE authenticated;
  v_facts := public.society_assistant_facts(v_community);
  IF coalesce(v_facts->>'financial_detail', '') <> 'restricted' THEN
    RAISE EXCEPTION 'resident must not receive full financial assistant facts';
  END IF;

  RAISE NOTICE 'governance ops assertions passed';
END;
$$;

-- Membership bootstrap RPC returns the caller's rows.
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;
SELECT public._assert(
  (SELECT count(*) FROM public.my_memberships()) >= 1,
  'creator sees membership via my_memberships'
);
RESET ROLE;

SELECT 'governance ops assertions passed' AS result;
