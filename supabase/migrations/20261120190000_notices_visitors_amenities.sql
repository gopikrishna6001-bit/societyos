-- Community notices, visitors, and amenity bookings for SABHA Platform.
-- Additive; scoped by community_id with RLS.

CREATE TABLE IF NOT EXISTS public.community_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all', 'owners', 'tenants', 'committee')),
  pinned boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_notice_reads (
  notice_id uuid NOT NULL REFERENCES public.community_notices(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notice_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.visitor_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id),
  visitor_name text NOT NULL,
  visitor_phone text,
  purpose text,
  vehicle_number text,
  pass_code text NOT NULL,
  status text NOT NULL DEFAULT 'expected'
    CHECK (status IN ('expected', 'checked_in', 'checked_out', 'cancelled', 'denied')),
  expected_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  checked_in_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS visitor_passes_code_live_idx
  ON public.visitor_passes (community_id, pass_code)
  WHERE status IN ('expected', 'checked_in');

CREATE TABLE IF NOT EXISTS public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT false,
  slot_minutes integer NOT NULL DEFAULT 60 CHECK (slot_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, name)
);

CREATE TABLE IF NOT EXISTS public.amenity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id),
  booked_by uuid NOT NULL REFERENCES public.profiles(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  purpose text,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE public.community_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_notices_read ON public.community_notices;
CREATE POLICY community_notices_read ON public.community_notices FOR SELECT TO authenticated
USING (private.is_member(community_id) AND published_at IS NOT NULL AND archived_at IS NULL
  OR private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']));

DROP POLICY IF EXISTS community_notices_write ON public.community_notices;
CREATE POLICY community_notices_write ON public.community_notices FOR ALL TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']))
WITH CHECK (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']));

DROP POLICY IF EXISTS notice_reads_own ON public.community_notice_reads;
CREATE POLICY notice_reads_own ON public.community_notice_reads FOR ALL TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS visitor_passes_read ON public.visitor_passes;
CREATE POLICY visitor_passes_read ON public.visitor_passes FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer'])
  OR created_by = auth.uid()
  OR (unit_id IS NOT NULL AND private.occupies(unit_id))
  OR EXISTS (
    SELECT 1 FROM public.community_memberships m
    WHERE m.community_id = visitor_passes.community_id
      AND m.profile_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('committee_admin', 'platform_admin')
  )
);

-- Guards: members with role stored as committee for now can manage; dedicated guard role optional.
DROP POLICY IF EXISTS visitor_passes_write ON public.visitor_passes;
CREATE POLICY visitor_passes_write ON public.visitor_passes FOR ALL TO authenticated
USING (
  private.has_role(community_id, ARRAY['committee_admin', 'platform_admin'])
  OR created_by = auth.uid()
  OR (unit_id IS NOT NULL AND private.occupies(unit_id))
)
WITH CHECK (
  private.has_role(community_id, ARRAY['committee_admin', 'platform_admin'])
  OR created_by = auth.uid()
  OR (unit_id IS NOT NULL AND private.occupies(unit_id))
);

DROP POLICY IF EXISTS amenities_read ON public.amenities;
CREATE POLICY amenities_read ON public.amenities FOR SELECT TO authenticated
USING (private.is_member(community_id));

DROP POLICY IF EXISTS amenities_write ON public.amenities;
CREATE POLICY amenities_write ON public.amenities FOR ALL TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']))
WITH CHECK (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']));

DROP POLICY IF EXISTS amenity_bookings_read ON public.amenity_bookings;
CREATE POLICY amenity_bookings_read ON public.amenity_bookings FOR SELECT TO authenticated
USING (
  private.is_member(community_id)
  AND (
    booked_by = auth.uid()
    OR private.has_role(community_id, ARRAY['committee_admin', 'platform_admin'])
    OR (unit_id IS NOT NULL AND private.occupies(unit_id))
  )
);

DROP POLICY IF EXISTS amenity_bookings_write ON public.amenity_bookings;
CREATE POLICY amenity_bookings_write ON public.amenity_bookings FOR ALL TO authenticated
USING (
  booked_by = auth.uid()
  OR private.has_role(community_id, ARRAY['committee_admin', 'platform_admin'])
)
WITH CHECK (
  booked_by = auth.uid()
  OR private.has_role(community_id, ARRAY['committee_admin', 'platform_admin'])
);

REVOKE ALL ON public.community_notices FROM PUBLIC, anon;
REVOKE ALL ON public.community_notice_reads FROM PUBLIC, anon;
REVOKE ALL ON public.visitor_passes FROM PUBLIC, anon;
REVOKE ALL ON public.amenities FROM PUBLIC, anon;
REVOKE ALL ON public.amenity_bookings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_notices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_notice_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_passes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amenities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amenity_bookings TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_community_notice(
  p_community uuid,
  p_title text,
  p_body text,
  p_audience text DEFAULT 'all',
  p_pinned boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.community_notices (
    community_id, title, body, audience, pinned, published_at, created_by
  ) VALUES (
    p_community, btrim(p_title), btrim(p_body), COALESCE(NULLIF(p_audience, ''), 'all'),
    COALESCE(p_pinned, false), now(), auth.uid()
  ) RETURNING id INTO v_id;

  INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
  SELECT p_community, m.profile_id, 'notice_published', btrim(p_title), left(btrim(p_body), 200)
  FROM public.community_memberships m
  WHERE m.community_id = p_community AND m.status = 'active';

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_community_notice(uuid, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_community_notice(uuid, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_visitor_pass(
  p_community uuid,
  p_visitor_name text,
  p_visitor_phone text DEFAULT NULL,
  p_purpose text DEFAULT NULL,
  p_unit_number text DEFAULT NULL,
  p_vehicle_number text DEFAULT NULL,
  p_expected_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit uuid;
  v_code text;
  v_id uuid;
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NULLIF(btrim(p_visitor_name), '') IS NULL THEN
    RAISE EXCEPTION 'visitor name required';
  END IF;
  IF NULLIF(btrim(p_unit_number), '') IS NOT NULL THEN
    SELECT id INTO v_unit FROM public.units
    WHERE community_id = p_community AND number = btrim(p_unit_number);
    IF v_unit IS NULL THEN
      RAISE EXCEPTION 'unit not found';
    END IF;
    IF NOT private.occupies(v_unit)
       AND NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
      RAISE EXCEPTION 'not authorized for this unit';
    END IF;
  END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.visitor_passes (
    community_id, unit_id, visitor_name, visitor_phone, purpose, vehicle_number,
    pass_code, expected_at, created_by, status
  ) VALUES (
    p_community, v_unit, btrim(p_visitor_name), NULLIF(btrim(p_visitor_phone), ''),
    NULLIF(btrim(p_purpose), ''), NULLIF(btrim(p_vehicle_number), ''),
    v_code, p_expected_at, auth.uid(), 'expected'
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'pass_code', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.create_visitor_pass(uuid, text, text, text, text, text, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_visitor_pass(uuid, text, text, text, text, text, timestamptz)
  TO authenticated;

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
  IF NOT private.has_role(v_pass.community_id, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_pass.status <> 'expected' THEN
    RAISE EXCEPTION 'pass is not awaiting check-in';
  END IF;
  UPDATE public.visitor_passes
  SET status = 'checked_in', checked_in_at = now(), checked_in_by = auth.uid(),
      notes = COALESCE(NULLIF(btrim(p_notes), ''), notes)
  WHERE id = p_pass;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_visitor(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_visitor(uuid, text) TO authenticated;

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
  IF NOT private.has_role(v_pass.community_id, ARRAY['committee_admin', 'platform_admin']) THEN
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

REVOKE ALL ON FUNCTION public.check_out_visitor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_out_visitor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.book_amenity(
  p_amenity uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_purpose text DEFAULT NULL,
  p_unit_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amenity public.amenities%ROWTYPE;
  v_unit uuid;
  v_id uuid;
  v_status text;
BEGIN
  SELECT * INTO v_amenity FROM public.amenities WHERE id = p_amenity AND is_active;
  IF v_amenity.id IS NULL THEN
    RAISE EXCEPTION 'amenity not found';
  END IF;
  IF NOT private.is_member(v_amenity.community_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'invalid booking window';
  END IF;
  IF NULLIF(btrim(p_unit_number), '') IS NOT NULL THEN
    SELECT id INTO v_unit FROM public.units
    WHERE community_id = v_amenity.community_id AND number = btrim(p_unit_number);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.amenity_bookings b
    WHERE b.amenity_id = p_amenity
      AND b.status IN ('pending', 'confirmed')
      AND b.starts_at < p_ends_at
      AND b.ends_at > p_starts_at
  ) THEN
    RAISE EXCEPTION 'slot unavailable';
  END IF;
  v_status := CASE WHEN v_amenity.requires_approval THEN 'pending' ELSE 'confirmed' END;
  INSERT INTO public.amenity_bookings (
    community_id, amenity_id, unit_id, booked_by, starts_at, ends_at, purpose, status
  ) VALUES (
    v_amenity.community_id, p_amenity, v_unit, auth.uid(), p_starts_at, p_ends_at,
    NULLIF(btrim(p_purpose), ''), v_status
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.book_amenity(uuid, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_amenity(uuid, timestamptz, timestamptz, text, text) TO authenticated;
