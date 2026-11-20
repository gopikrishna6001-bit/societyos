-- WhatsApp dispatch hardening (additive).
-- Apply only with explicit human approval. Does not deploy Edge Functions.

-- 1) Claim / retry metadata on whatsapp_log (hosted columns already include society_id + status).
ALTER TABLE public.whatsapp_log
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_token text;

COMMENT ON COLUMN public.whatsapp_log.attempt_count IS 'Dispatch attempts; capped by claim_whatsapp_batch.';
COMMENT ON COLUMN public.whatsapp_log.last_error IS 'Safe failure reason (no secrets).';
COMMENT ON COLUMN public.whatsapp_log.claim_token IS 'Opaque token written by atomic claim; used for idempotent finalize.';

-- 2) Atomic society-scoped claim (SKIP LOCKED). Callable only by service_role.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_batch(
  p_society_id uuid,
  p_limit integer DEFAULT 20,
  p_claim_token text DEFAULT NULL
)
RETURNS SETOF public.whatsapp_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 25);
  v_token text := COALESCE(NULLIF(btrim(p_claim_token), ''), gen_random_uuid()::text);
BEGIN
  IF p_society_id IS NULL THEN
    RAISE EXCEPTION 'society_id required';
  END IF;

  RETURN QUERY
  WITH picked AS (
    SELECT w.id
    FROM public.whatsapp_log w
    WHERE w.society_id = p_society_id
      AND w.status = 'pending'
      AND w.attempt_count < 5
    ORDER BY w.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.whatsapp_log w
  SET
    status = 'sending',
    claim_token = v_token,
    claimed_at = now(),
    attempt_count = w.attempt_count + 1,
    last_error = NULL
  FROM picked
  WHERE w.id = picked.id
  RETURNING w.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_batch(uuid, integer, text) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_whatsapp_batch(uuid, integer, text) TO service_role';
  END IF;
END $$;

-- 3) Idempotent finalize: only the claim owner can mark delivered/failed.
CREATE OR REPLACE FUNCTION public.finalize_whatsapp_dispatch(
  p_id uuid,
  p_claim_token text,
  p_society_id uuid,
  p_success boolean,
  p_wa_msg_id text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
  v_safe_error text := left(regexp_replace(COALESCE(p_error, ''), '(Bearer|token|secret|apikey|password)\s*[:=]?\s*\S+', '[redacted]', 'gi'), 500);
BEGIN
  IF p_id IS NULL OR p_claim_token IS NULL OR p_society_id IS NULL THEN
    RAISE EXCEPTION 'id, claim_token, and society_id required';
  END IF;

  IF p_success THEN
    UPDATE public.whatsapp_log
    SET
      status = 'delivered',
      wa_msg_id = COALESCE(p_wa_msg_id, wa_msg_id),
      sent_at = COALESCE(sent_at, now()),
      last_error = NULL,
      claim_token = NULL
    WHERE id = p_id
      AND society_id = p_society_id
      AND claim_token = p_claim_token
      AND status = 'sending';
  ELSE
    UPDATE public.whatsapp_log
    SET
      status = CASE WHEN attempt_count >= 5 THEN 'failed' ELSE 'pending' END,
      last_error = v_safe_error,
      claim_token = NULL,
      claimed_at = NULL
    WHERE id = p_id
      AND society_id = p_society_id
      AND claim_token = p_claim_token
      AND status = 'sending';
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_whatsapp_dispatch(uuid, text, uuid, boolean, text, text)
  FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_dispatch(uuid, text, uuid, boolean, text, text) TO service_role';
  END IF;
END $$;

-- 4) Stop DB trigger from HTTP-posting with service-role Bearer (hosted vulnerability).
-- Messages remain queued as pending; cron/operator invokes send-whatsapp with the dispatch secret.
CREATE OR REPLACE FUNCTION public.trigger_send_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_send_whatsapp() FROM PUBLIC, anon, authenticated;
