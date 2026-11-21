-- Accept OpenSociety-style QR payloads (OS-PA:CODE) at the gate.

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
  v_raw text := upper(btrim(COALESCE(p_code, '')));
  v_code text;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin', 'treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_raw = '' THEN
    RAISE EXCEPTION 'pass code required';
  END IF;

  IF left(v_raw, 6) = 'OS-PA:' THEN
    v_code := btrim(substr(v_raw, 7));
  ELSIF left(v_raw, 9) = 'SABHA-PA:' THEN
    v_code := btrim(substr(v_raw, 10));
  ELSE
    v_code := v_raw;
  END IF;

  IF v_code !~ '^[A-Z0-9]{6,16}$' THEN
    RAISE EXCEPTION 'invalid or inactive pass code';
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
