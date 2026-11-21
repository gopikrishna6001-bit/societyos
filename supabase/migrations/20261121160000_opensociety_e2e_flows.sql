-- OpenSociety-parity E2E helpers: gate redeem by pass code, cancel pass, mark notice read,
-- and notify the host when a guest is checked in.

CREATE OR REPLACE FUNCTION public.check_in_visitor_by_code(
  p_community uuid,
  p_code text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass public.visitor_passes%ROWTYPE;
  v_code text := upper(btrim(COALESCE(p_code, '')));
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin', 'treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'pass code required';
  END IF;

  SELECT * INTO v_pass
  FROM public.visitor_passes
  WHERE community_id = p_community
    AND upper(pass_code) = v_code
    AND status = 'expected'
  FOR UPDATE;

  IF v_pass.id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive pass code';
  END IF;

  UPDATE public.visitor_passes
  SET status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = auth.uid(),
      notes = COALESCE(NULLIF(btrim(p_notes), ''), notes)
  WHERE id = v_pass.id;

  IF v_pass.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
    VALUES (
      p_community,
      v_pass.created_by,
      'visitor_checked_in',
      'Guest checked in',
      v_pass.visitor_name || ' used pass ' || v_pass.pass_code || ' at the gate.'
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_pass.id,
    'pass_code', v_pass.pass_code,
    'visitor_name', v_pass.visitor_name,
    'status', 'checked_in'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_visitor_by_code(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_visitor_by_code(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_visitor_pass(p_pass uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass public.visitor_passes%ROWTYPE;
BEGIN
  SELECT * INTO v_pass FROM public.visitor_passes WHERE id = p_pass FOR UPDATE;
  IF v_pass.id IS NULL THEN
    RAISE EXCEPTION 'pass not found';
  END IF;
  IF NOT (
    v_pass.created_by = auth.uid()
    OR private.has_role(v_pass.community_id, ARRAY['committee_admin', 'platform_admin'])
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_pass.status NOT IN ('expected') THEN
    RAISE EXCEPTION 'only expected passes can be cancelled';
  END IF;
  UPDATE public.visitor_passes SET status = 'cancelled' WHERE id = p_pass;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_visitor_pass(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_visitor_pass(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notice_read(p_notice uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notice public.community_notices%ROWTYPE;
BEGIN
  SELECT * INTO v_notice FROM public.community_notices WHERE id = p_notice;
  IF v_notice.id IS NULL OR v_notice.published_at IS NULL OR v_notice.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'notice not found';
  END IF;
  IF NOT private.is_member(v_notice.community_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.community_notice_reads (notice_id, profile_id, read_at)
  VALUES (p_notice, auth.uid(), now())
  ON CONFLICT (notice_id, profile_id) DO UPDATE SET read_at = excluded.read_at;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notice_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notice_read(uuid) TO authenticated;

-- Enrich check-in-by-id with the same host notification.
CREATE OR REPLACE FUNCTION public.check_in_visitor(p_pass uuid, p_notes text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass public.visitor_passes%ROWTYPE;
BEGIN
  SELECT * INTO v_pass FROM public.visitor_passes WHERE id = p_pass FOR UPDATE;
  IF v_pass.id IS NULL THEN
    RAISE EXCEPTION 'pass not found';
  END IF;
  IF NOT private.has_role(v_pass.community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_pass.status <> 'expected' THEN
    RAISE EXCEPTION 'pass is not awaiting check-in';
  END IF;
  UPDATE public.visitor_passes
  SET status = 'checked_in', checked_in_at = now(), checked_in_by = auth.uid(),
      notes = COALESCE(NULLIF(btrim(p_notes), ''), notes)
  WHERE id = p_pass;

  IF v_pass.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
    VALUES (
      v_pass.community_id,
      v_pass.created_by,
      'visitor_checked_in',
      'Guest checked in',
      v_pass.visitor_name || ' used pass ' || v_pass.pass_code || ' at the gate.'
    );
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_out_visitor(p_pass uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass public.visitor_passes%ROWTYPE;
BEGIN
  SELECT * INTO v_pass FROM public.visitor_passes WHERE id = p_pass FOR UPDATE;
  IF v_pass.id IS NULL THEN
    RAISE EXCEPTION 'pass not found';
  END IF;
  IF NOT private.has_role(v_pass.community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_pass.status <> 'checked_in' THEN
    RAISE EXCEPTION 'visitor is not checked in';
  END IF;
  UPDATE public.visitor_passes
  SET status = 'checked_out', checked_out_at = now()
  WHERE id = p_pass;
  RETURN true;
END;
$$;
