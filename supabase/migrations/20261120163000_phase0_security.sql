-- Phase 0 security remediation (additive, idempotent).
-- Apply only with explicit human approval on the chosen environment.
-- Do not replay the full platform foundation migration beside this file.

-- 1) Credential columns on legacy residents must not be selectable by clients.
-- Revoke per column so a missing column on a divergent schema cannot abort the rest.
DO $$
DECLARE
  v_col text;
BEGIN
  FOREACH v_col IN ARRAY ARRAY[
    'pin', 'pin_hash', 'portal_pin', 'id_number', 'id_document_url', 'id_type'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'residents' AND column_name = v_col
    ) THEN
      EXECUTE format(
        'REVOKE SELECT (%I) ON public.residents FROM PUBLIC, anon, authenticated',
        v_col
      );
    END IF;
  END LOOP;
END $$;

-- 2) Anonymous callers cannot execute messaging, number generators, or policy helpers.
DO $$
DECLARE
  v_name text;
  v_sig text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'trigger_send_whatsapp',
    'generate_invoice_number',
    'generate_ticket_number'
  ]
  LOOP
    FOR v_sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
    END LOOP;
  END LOOP;

  FOREACH v_name IN ARRAY ARRAY[
    'is_committee',
    'is_super_admin',
    'has_role',
    'get_my_flat',
    'get_my_society_id',
    'get_resident_id'
  ]
  LOOP
    FOR v_sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
    END LOOP;
  END LOOP;
END $$;

-- 3) SABHA dashboard RPCs must not be executable by anonymous callers.
-- Bodies already raise when membership is missing; this removes the anon grant.
DO $$
DECLARE
  v_sig text;
BEGIN
  FOR v_sig IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('account_balances', 'resident_dashboard', 'bank_balances')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
  END LOOP;
END $$;
