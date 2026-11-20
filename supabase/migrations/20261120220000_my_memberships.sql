-- Membership bootstrap without nested PostgREST embeds / RLS edge cases.
-- SECURITY DEFINER reads the caller's own memberships only.

CREATE OR REPLACE FUNCTION public.my_memberships()
RETURNS TABLE (
  community_id uuid,
  role text,
  community_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.community_id, m.role, c.name
  FROM public.community_memberships m
  JOIN public.communities c ON c.id = m.community_id
  WHERE m.profile_id = auth.uid()
    AND m.status = 'active'
  ORDER BY c.name, m.role;
$$;

REVOKE ALL ON FUNCTION public.my_memberships() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_memberships() TO authenticated;
