-- Invitation-based membership. Do not apply this file to the hosted project
-- until it has been reviewed. It does not delete residents or auth users.
-- Phone and PIN columns are left in place so existing rows can be cleaned up
-- in a separate, approved script. Authenticated clients lose SELECT on them.

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('resident', 'treasurer', 'committee_admin', 'platform_admin')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE public.auth_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.auth_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_invitation(p_community uuid, p_email text, p_role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_token text;
  v_hash text;
  v_recent integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_role = 'resident_auditor' OR p_role NOT IN ('resident', 'treasurer', 'committee_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF position('@' in v_email) < 2 THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_role IN ('committee_admin', 'platform_admin') THEN
    IF NOT private.has_role(p_community, ARRAY['platform_admin']) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  ELSIF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.invitations
  WHERE created_by = auth.uid()
    AND created_at > now() - interval '1 hour';
  IF v_recent >= 10 THEN
    INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_rate_limited', auth.uid());
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');
  INSERT INTO public.invitations (community_id, email, role, token_hash, expires_at, created_by)
  VALUES (p_community, v_email, p_role, v_hash, now() + interval '7 days', auth.uid());
  INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_created', auth.uid());
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_row public.invitations%ROWTYPE;
  v_email text;
  v_id uuid;
  v_recent integer;
BEGIN
  IF auth.uid() IS NULL OR p_token IS NULL OR length(p_token) < 64 THEN
    INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_rejected', auth.uid());
    RAISE EXCEPTION 'invitation is not valid';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.auth_events
  WHERE actor = auth.uid()
    AND event_type = 'invitation_rejected'
    AND created_at > now() - interval '15 minutes';
  IF v_recent >= 8 THEN
    INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_rate_limited', auth.uid());
    RAISE EXCEPTION 'invitation is not valid';
  END IF;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  SELECT * INTO v_row
  FROM public.invitations
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND OR v_row.used_at IS NOT NULL OR v_row.expires_at <= now() THEN
    INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_rejected', auth.uid());
    RAISE EXCEPTION 'invitation is not valid';
  END IF;

  SELECT lower(email) INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> lower(v_row.email) THEN
    INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_rejected', auth.uid());
    RAISE EXCEPTION 'invitation is not valid';
  END IF;

  UPDATE public.invitations
  SET used_at = now()
  WHERE id = v_row.id AND used_at IS NULL;

  INSERT INTO public.community_memberships (community_id, profile_id, role, created_by)
  VALUES (v_row.community_id, auth.uid(), v_row.role, v_row.created_by)
  ON CONFLICT (community_id, profile_id, role)
  DO UPDATE SET status = 'active'
  RETURNING id INTO v_id;

  INSERT INTO public.auth_events (event_type, actor) VALUES ('invitation_accepted', auth.uid());
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invitation(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- Anonymous callers cannot execute account-management or messaging helpers
-- that already exist on a hosted project. Missing functions are skipped.
-- Helpers used by row-level policies stay executable by signed-in users.
DO $$
DECLARE
  v_name text;
  v_sig text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'trigger_send_whatsapp', 'generate_invoice_number', 'generate_ticket_number'
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
    'is_committee', 'is_super_admin', 'has_role', 'get_my_flat', 'get_my_society_id', 'get_resident_id'
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

-- Credential columns stay in the table for an approved cleanup. Clients cannot read them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'residents' AND column_name = 'pin'
  ) THEN
    REVOKE SELECT (pin, pin_hash, portal_pin, id_number, id_document_url, id_type)
      ON public.residents FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
