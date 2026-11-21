-- Sync ticket counters so create_ticket no longer collides with seeded numbers
INSERT INTO public.ticket_counters (community_id, year, last_value)
SELECT community_id,
       COALESCE(NULLIF(substring(ticket_number from 'SOC-([0-9]{4})'), '')::int, EXTRACT(YEAR FROM now())::int) AS year,
       MAX(COALESCE(NULLIF(substring(ticket_number from 'SOC-[0-9]{4}-([0-9]+)'), '')::int, 0)) AS last_value
FROM public.tickets
GROUP BY 1, 2
ON CONFLICT (community_id, year) DO UPDATE
SET last_value = GREATEST(public.ticket_counters.last_value, EXCLUDED.last_value);

CREATE OR REPLACE FUNCTION private.next_ticket_number(p_community uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_value integer;
  v_existing integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN ticket_number ~ ('^SOC-' || v_year::text || '-[0-9]+$')
      THEN NULLIF(substring(ticket_number from '[0-9]+$'), '')::int
      ELSE 0 END
  ), 0)
  INTO v_existing
  FROM public.tickets
  WHERE community_id = p_community;

  INSERT INTO public.ticket_counters (community_id, year, last_value)
  VALUES (p_community, v_year, GREATEST(v_existing, 0) + 1)
  ON CONFLICT (community_id, year)
  DO UPDATE SET last_value = GREATEST(public.ticket_counters.last_value, v_existing) + 1
  RETURNING last_value INTO v_value;

  RETURN 'SOC-' || v_year::text || '-' || lpad(v_value::text, 5, '0');
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-originals',
  'community-originals',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS community_originals_select ON storage.objects;
DROP POLICY IF EXISTS community_originals_insert ON storage.objects;
DROP POLICY IF EXISTS community_originals_update ON storage.objects;
DROP POLICY IF EXISTS community_originals_delete ON storage.objects;

CREATE POLICY community_originals_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'community-originals'
  AND private.is_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY community_originals_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-originals'
  AND private.is_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY community_originals_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'community-originals'
  AND private.is_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY community_originals_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'community-originals'
  AND private.is_member((storage.foldername(name))[1]::uuid)
);
