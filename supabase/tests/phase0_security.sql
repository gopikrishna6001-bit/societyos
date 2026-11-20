-- Assertions after applying phase0 + whatsapp dispatch migrations on a disposable DB.
-- Run via scripts/test-phase0-security.sh only.

DO $$
DECLARE
  v_ok boolean;
  v_name text;
  v_sig text;
  v_col text;
BEGIN
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
      SELECT has_function_privilege('anon', v_sig::regprocedure, 'EXECUTE') INTO v_ok;
      IF v_ok THEN
        RAISE EXCEPTION 'anon unexpectedly has EXECUTE on %', v_sig;
      END IF;
    END LOOP;
  END LOOP;

  -- Every sensitive residents column: SELECT denied for anon and authenticated.
  FOREACH v_col IN ARRAY ARRAY[
    'pin', 'pin_hash', 'portal_pin', 'id_number', 'id_document_url', 'id_type'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'residents' AND column_name = v_col
    ) THEN
      RAISE EXCEPTION 'expected residents.% missing from representative schema', v_col;
    END IF;
    IF has_column_privilege('anon', 'public.residents', v_col, 'SELECT') THEN
      RAISE EXCEPTION 'anon still has SELECT on residents.%', v_col;
    END IF;
    IF has_column_privilege('authenticated', 'public.residents', v_col, 'SELECT') THEN
      RAISE EXCEPTION 'authenticated still has SELECT on residents.%', v_col;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_log' AND column_name = 'claim_token'
  ) THEN
    RAISE EXCEPTION 'whatsapp_log.claim_token missing';
  END IF;
END $$;

-- Atomic claim, active-lease protection, stale recovery, finalize, society isolation.
DO $$
DECLARE
  v_society uuid;
  v_other uuid;
  v_id uuid;
  v_stale uuid;
  v_token text := 'test-claim-token';
  v_row public.whatsapp_log%ROWTYPE;
  v_ok boolean;
BEGIN
  INSERT INTO public.societies (name) VALUES ('phase0-wa-test') RETURNING id INTO v_society;
  INSERT INTO public.societies (name) VALUES ('phase0-wa-other') RETURNING id INTO v_other;

  INSERT INTO public.whatsapp_log (society_id, to_number, message, status)
  VALUES (v_society, '9876543210', 'hello', 'pending')
  RETURNING id INTO v_id;

  -- Fresh claim.
  SELECT * INTO v_row FROM public.claim_whatsapp_batch(v_society, 10, v_token, 60) LIMIT 1;
  IF v_row.id IS DISTINCT FROM v_id OR v_row.status <> 'sending' OR v_row.claim_token <> v_token THEN
    RAISE EXCEPTION 'claim_whatsapp_batch failed';
  END IF;

  -- Active claim must not be reclaimed (same society, short lease).
  IF EXISTS (SELECT 1 FROM public.claim_whatsapp_batch(v_society, 10, 'other', 60)) THEN
    RAISE EXCEPTION 'active claim was reclaimed';
  END IF;

  -- Other society must not see this row.
  IF EXISTS (SELECT 1 FROM public.claim_whatsapp_batch(v_other, 10, 'cross', 60)) THEN
    RAISE EXCEPTION 'cross-society claim returned a row';
  END IF;

  SELECT public.finalize_whatsapp_dispatch(v_id, v_token, v_society, true, 'wamid.test', NULL) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'finalize success failed';
  END IF;
  IF (SELECT status FROM public.whatsapp_log WHERE id = v_id) <> 'delivered' THEN
    RAISE EXCEPTION 'expected delivered after finalize';
  END IF;

  -- Stale sending recovery: insert stuck sending with old claimed_at.
  INSERT INTO public.whatsapp_log (
    society_id, to_number, message, status, attempt_count, claimed_at, claim_token, last_error
  ) VALUES (
    v_society, '9876543211', 'stale', 'sending', 1,
    now() - interval '10 minutes', 'old-token', 'dispatcher crashed'
  ) RETURNING id INTO v_stale;

  SELECT * INTO v_row FROM public.claim_whatsapp_batch(v_society, 10, 'recover-token', 60) LIMIT 1;
  IF v_row.id IS DISTINCT FROM v_stale THEN
    RAISE EXCEPTION 'stale claim was not recovered';
  END IF;
  IF v_row.claim_token <> 'recover-token' OR v_row.attempt_count <> 2 THEN
    RAISE EXCEPTION 'stale recovery did not rotate token / increment attempts';
  END IF;
  IF v_row.last_error IS NULL OR v_row.last_error NOT ILIKE 'stale_claim_recovered%' THEN
    RAISE EXCEPTION 'stale recovery did not record safe reason';
  END IF;

  -- Idempotent: second recovery while active lease must not reclaim.
  IF EXISTS (SELECT 1 FROM public.claim_whatsapp_batch(v_society, 10, 'again', 60)) THEN
    RAISE EXCEPTION 'recovered claim was reclaimed while active';
  END IF;

  -- Attempt cap: exhausted sending stale row must not reclaim.
  UPDATE public.whatsapp_log
  SET attempt_count = 5, status = 'sending', claimed_at = now() - interval '1 hour', claim_token = 'x'
  WHERE id = v_stale;
  IF EXISTS (SELECT 1 FROM public.claim_whatsapp_batch(v_society, 10, 'cap', 60)) THEN
    RAISE EXCEPTION 'attempt_count cap violated';
  END IF;
END $$;

-- Invoice / ticket triggers still fire without client EXECUTE on generators.
DO $$
DECLARE
  v_inv text;
  v_tkt text;
BEGIN
  INSERT INTO public.invoices (society_id, total_amount, amount_paid)
  VALUES (gen_random_uuid(), 100, 0)
  RETURNING invoice_number INTO v_inv;
  IF v_inv IS NULL OR v_inv NOT LIKE 'INV/%' THEN
    RAISE EXCEPTION 'invoice trigger did not assign number: %', v_inv;
  END IF;

  INSERT INTO public.tickets_legacy (society_id)
  VALUES (gen_random_uuid())
  RETURNING ticket_number INTO v_tkt;
  IF v_tkt IS NULL OR v_tkt NOT LIKE 'TKT-%' THEN
    RAISE EXCEPTION 'ticket trigger did not assign number: %', v_tkt;
  END IF;
END $$;

-- WhatsApp queue insert + no-op trigger (must not raise).
INSERT INTO public.whatsapp_log (society_id, to_number, message, status)
SELECT id, '9000000000', 'queued', 'pending' FROM public.societies LIMIT 1;

-- Client roles cannot EXECUTE claim/finalize (permission denied).
DO $$
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM * FROM public.claim_whatsapp_batch(
      '00000000-0000-0000-0000-000000000001'::uuid, 1, 'x', 60
    );
    RESET ROLE;
    RAISE EXCEPTION 'authenticated executed claim_whatsapp_batch';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RESET ROLE;
    WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN
        NULL;
      ELSE
        -- function may raise society errors only if EXECUTE succeeded
        IF SQLERRM ILIKE '%permission denied%' THEN
          NULL;
        END IF;
        RAISE EXCEPTION 'unexpected authenticated claim result: %', SQLERRM;
      END IF;
  END;

  BEGIN
    SET ROLE anon;
    PERFORM public.finalize_whatsapp_dispatch(
      '00000000-0000-0000-0000-000000000001'::uuid,
      'x',
      '00000000-0000-0000-0000-000000000001'::uuid,
      false,
      NULL,
      'x'
    );
    RESET ROLE;
    RAISE EXCEPTION 'anon executed finalize_whatsapp_dispatch';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RESET ROLE;
    WHEN OTHERS THEN
      RESET ROLE;
      IF SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected anon finalize result: %', SQLERRM;
      END IF;
  END;
END $$;

-- Authenticated dashboard + policy helpers remain operational.
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
  PERFORM public.bank_balances(v_community);
  PERFORM public.is_committee();
  PERFORM public.is_super_admin();
  PERFORM public.get_my_society_id();
  PERFORM public.get_my_flat();
  PERFORM public.get_resident_id();
  PERFORM public.has_role('secretary');
END $$;

RESET ROLE;

SELECT 'phase0 security assertions passed' AS result;
