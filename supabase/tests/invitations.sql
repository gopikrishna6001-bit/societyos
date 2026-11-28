-- Invitation, role, and tenant checks. Runs after the ledger fixture.
SET search_path = public, extensions;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;

SELECT public._put('invite_community', public.create_community('Invite Test', 'Road 2', 'Hyderabad', 1000, 5000, 10)::text);
SELECT public._put('resident_token', public.create_invitation(public._get('invite_community')::uuid, 'ravi@example.com', 'resident'));
SELECT public._put('other_token', public.create_invitation(public._get('invite_community')::uuid, 'leela@example.com', 'treasurer'));
SELECT public.create_invitation(public._get('invite_community')::uuid, 'meera@example.com', 'committee_admin');

RESET ROLE;
SELECT public._assert(
  (
    SELECT token_hash FROM public.invitations
    WHERE email = 'ravi@example.com' AND community_id = public._get('invite_community')::uuid
  ) = encode(digest(public._get('resident_token'), 'sha256'), 'hex'),
  'the invitation stores a hash, not the raw token'
);
SELECT public._assert(
  (
    SELECT token_hash <> public._get('resident_token') FROM public.invitations
    WHERE email = 'ravi@example.com' AND community_id = public._get('invite_community')::uuid
  ),
  'the raw token is not stored in token_hash'
);

INSERT INTO public.community_memberships (community_id, profile_id, role, created_by)
VALUES (
  public._get('invite_community')::uuid,
  '33333333-3333-3333-3333-333333333333',
  'committee_admin',
  '11111111-1111-1111-1111-111111111111'
);

SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
SET ROLE authenticated;

DO $$
BEGIN
  PERFORM public.create_invitation(public._get('invite_community')::uuid, 'extra@example.com', 'platform_admin');
  RAISE EXCEPTION 'expected platform invitation to fail';
EXCEPTION WHEN OTHERS THEN
  PERFORM public._assert(SQLERRM = 'not authorized', 'a committee admin cannot invite a platform admin');
END $$;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

DO $$
BEGIN
  PERFORM public.create_invitation(public._get('invite_community')::uuid, 'extra@example.com', 'resident');
  RAISE EXCEPTION 'expected resident invitation to fail';
EXCEPTION WHEN OTHERS THEN
  PERFORM public._assert(SQLERRM = 'not authorized', 'a resident cannot create an invitation');
END $$;

DO $$
BEGIN
  INSERT INTO public.community_memberships (community_id, profile_id, role)
  VALUES (public._get('invite_community')::uuid, '22222222-2222-2222-2222-222222222222', 'platform_admin');
  RAISE EXCEPTION 'expected direct role insert to fail';
EXCEPTION WHEN OTHERS THEN
  PERFORM public._assert(SQLERRM <> 'expected direct role insert to fail', 'a resident cannot insert a membership');
END $$;

DO $$
BEGIN
  PERFORM public.accept_invitation(public._get('other_token'));
  RAISE EXCEPTION 'expected mismatched invitation to fail';
EXCEPTION WHEN OTHERS THEN
  PERFORM public._assert(SQLERRM = 'invitation is not valid', 'an invitation for another email is rejected');
END $$;

RESET ROLE;
SELECT public._assert(
  (
    SELECT used_at IS NULL FROM public.invitations
    WHERE email = 'leela@example.com' AND community_id = public._get('invite_community')::uuid
  ),
  'a rejected invitation stays unused'
);

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
SELECT public.accept_invitation(public._get('resident_token'));

RESET ROLE;
SELECT public._assert(
  EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE community_id = public._get('invite_community')::uuid
      AND profile_id = '22222222-2222-2222-2222-222222222222'
      AND role = 'resident'
      AND status = 'active'
  ),
  'a matching invitation grants only the invited role'
);
SELECT public._assert(
  NOT EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE community_id = public._get('invite_community')::uuid
      AND profile_id = '22222222-2222-2222-2222-222222222222'
      AND role <> 'resident'
  ),
  'accepting an invitation does not grant a second role'
);

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM public.accept_invitation(public._get('resident_token'));
  RAISE EXCEPTION 'expected reused invitation to fail';
EXCEPTION WHEN OTHERS THEN
  PERFORM public._assert(SQLERRM = 'invitation is not valid', 'an invitation cannot be reused');
END $$;

RESET ROLE;
UPDATE public.invitations
SET created_at = now() - interval '2 minutes',
    expires_at = now() - interval '1 minute'
WHERE email = 'leela@example.com' AND community_id = public._get('invite_community')::uuid;

SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM public.accept_invitation(public._get('other_token'));
  RAISE EXCEPTION 'expected expired invitation to fail';
EXCEPTION WHEN OTHERS THEN
  PERFORM public._assert(SQLERRM = 'invitation is not valid', 'an expired invitation is rejected');
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;
DO $$
DECLARE
  v_n integer;
BEGIN
  FOR v_n IN 1..7 LOOP
    PERFORM public.create_invitation(public._get('invite_community')::uuid, 'batch' || v_n || '@example.com', 'resident');
  END LOOP;
  BEGIN
    PERFORM public.create_invitation(public._get('invite_community')::uuid, 'over-limit@example.com', 'resident');
    RAISE EXCEPTION 'expected the invitation rate limit';
  EXCEPTION WHEN OTHERS THEN
    PERFORM public._assert(SQLERRM = 'not authorized', 'invitation creation is rate limited');
  END;
END $$;

RESET ROLE;
SET ROLE anon;
SELECT public._assert(
  has_function_privilege('anon', 'public.create_invitation(uuid,text,text)', 'EXECUTE') = false,
  'anonymous users cannot execute create_invitation'
);
SELECT public._assert(
  has_function_privilege('anon', 'public.accept_invitation(text)', 'EXECUTE') = false,
  'anonymous users cannot execute accept_invitation'
);
SELECT public._assert(
  has_table_privilege('anon', 'public.invitations', 'SELECT') = false,
  'anonymous users cannot read invitations'
);
RESET ROLE;
