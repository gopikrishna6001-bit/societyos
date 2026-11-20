-- Assertions after applying phase0 + whatsapp dispatch migrations on a disposable DB.
-- Run via scripts/test-phase0-security.sh only.

DO $$
DECLARE
  v_ok boolean;
  v_name text;
  v_sig text;
BEGIN
  -- Before-style baseline was restored by stubs; after phase0 anon must be denied.
  FOREACH v_name IN ARRAY ARRAY[
    'trigger_send_whatsapp',
    'generate_invoice_number',
    'generate_ticket_number',
    'is_committee',
    'is_super_admin',
    'has_role',
    'get_my_flat',
    'get_my_society_id',
    'get_resident_id',
    'account_balances',
    'resident_dashboard',
    'bank_balances',
    'claim_whatsapp_batch',
    'finalize_whatsapp_dispatch'
  ]
  LOOP
    FOR v_sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    LOOP
      SELECT has_function_privilege('anon', v_sig::regprocedure, 'EXECUTE') INTO v_ok;
      IF v_ok THEN
        RAISE EXCEPTION 'anon still has EXECUTE on %', v_sig;
      END IF;
    END LOOP;
  END LOOP;

  -- Authenticated must retain policy helpers + dashboard RPCs.
  FOREACH v_name IN ARRAY ARRAY[
    'is_committee',
    'is_super_admin',
    'has_role',
    'get_my_flat',
    'get_my_society_id',
    'get_resident_id',
    'account_balances',
    'resident_dashboard',
    'bank_balances'
  ]
  LOOP
    FOR v_sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    LOOP
      SELECT has_function_privilege('authenticated', v_sig::regprocedure, 'EXECUTE') INTO v_ok;
      IF NOT v_ok THEN
        RAISE EXCEPTION 'authenticated lost EXECUTE on %', v_sig;
      END IF;
    END LOOP;
  END LOOP;

  -- Trigger / generator / claim RPCs must not be client-callable.
  FOREACH v_name IN ARRAY ARRAY[
    'trigger_send_whatsapp',
    'generate_invoice_number',
    'generate_ticket_number',
    'claim_whatsapp_batch',
    'finalize_whatsapp_dispatch'
  ]
  LOOP
    FOR v_sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    LOOP
      SELECT has_function_privilege('authenticated', v_sig::regprocedure, 'EXECUTE') INTO v_ok;
      IF v_ok THEN
        RAISE EXCEPTION 'authenticated unexpectedly has EXECUTE on %', v_sig;
      END IF;
    END LOOP;
  END LOOP;

  -- PIN columns revoked from anon/authenticated.
  IF has_column_privilege('anon', 'public.residents', 'pin', 'SELECT')
     OR has_column_privilege('authenticated', 'public.residents', 'pin', 'SELECT') THEN
    RAISE EXCEPTION 'residents.pin still selectable by clients';
  END IF;

  -- Claim columns exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_log' AND column_name = 'claim_token'
  ) THEN
    RAISE EXCEPTION 'whatsapp_log.claim_token missing';
  END IF;
END $$;

-- Atomic claim + finalize smoke (service_role / owner path).
DO $$
DECLARE
  v_society uuid;
  v_id uuid;
  v_token text := 'test-claim-token';
  v_row public.whatsapp_log%ROWTYPE;
  v_ok boolean;
BEGIN
  INSERT INTO public.societies (name) VALUES ('phase0-wa-test') RETURNING id INTO v_society;
  INSERT INTO public.whatsapp_log (society_id, to_number, message, status)
  VALUES (v_society, '9876543210', 'hello', 'pending')
  RETURNING id INTO v_id;

  SELECT * INTO v_row FROM public.claim_whatsapp_batch(v_society, 10, v_token) LIMIT 1;
  IF v_row.id IS DISTINCT FROM v_id OR v_row.status <> 'sending' OR v_row.claim_token <> v_token THEN
    RAISE EXCEPTION 'claim_whatsapp_batch failed';
  END IF;

  -- Second claim should return nothing (row locked as sending).
  IF EXISTS (SELECT 1 FROM public.claim_whatsapp_batch(v_society, 10, 'other')) THEN
    RAISE EXCEPTION 'duplicate claim returned a row';
  END IF;

  SELECT public.finalize_whatsapp_dispatch(v_id, v_token, v_society, true, 'wamid.test', NULL) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'finalize success failed';
  END IF;
  IF (SELECT status FROM public.whatsapp_log WHERE id = v_id) <> 'delivered' THEN
    RAISE EXCEPTION 'expected delivered after finalize';
  END IF;
END $$;

-- Authenticated can still call dashboard RPCs (membership authorization inside SECURITY DEFINER).
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'phase0@example.com', '{"full_name":"Phase0"}')
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid;
  v_count integer;
BEGIN
  v_community := public.create_community('Phase0 Auth Check', 'Road 1', 'Hyderabad', 1000, 5000, 10);
  SELECT count(*) INTO v_count FROM public.account_balances(v_community);
  IF v_count IS NULL THEN
    RAISE EXCEPTION 'account_balances failed under authenticated';
  END IF;
  PERFORM public.resident_dashboard(v_community);
  PERFORM public.is_committee();
  PERFORM public.get_my_society_id();
END $$;

RESET ROLE;

SELECT 'phase0 security assertions passed' AS result;
