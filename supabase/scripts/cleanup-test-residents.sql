-- Test-data cleanup for the hosted SocietyOS project.
-- DO NOT RUN until the affected rows have been reviewed and this run is approved.
-- The script refuses to change anything unless the session sets cleanup.confirm.
-- It keeps the society row, community configuration, and legacy expenses.
-- Run it inside one transaction. If any guard fails, nothing is committed.
--
-- Reviewed 19 Nov 2026, read-only counts:
--   societies: 1
--   residents: 10, every row has phone and plaintext pin, 1 auth_user_id, 1 super admin
--   auth.users: 10, of which 2 use the synthetic phone-login domain and 5 use the demo domain
--   community_memberships: 5
--   invoices with resident_id: 10
--   payments with resident_id: 2
--   complaints: 4, none with raised_by set
--   committee_members: 0
--   family_members: 2
--   visitors: 1
--   legacy_expenses: 3, no foreign key to residents
--
-- Foreign keys that reference public.residents:
--   amenity_bookings, campaign_joins, classifieds, committee_members,
--   complaint_comments, complaint_votes, complaints.raised_by, emergency_contacts,
--   family_members, forum_replies, forum_topics, harmony_scores, invoices,
--   legacy_notifications, maintenance_tasks, meeting_rsvps, move_history,
--   notice_reads, payments, pets, poll_votes, resident_documents, user_roles,
--   vehicles, visitors.approved_by, volunteers
--
-- This script deletes the dependent test rows, then the resident rows, then
-- Auth users on the synthetic and demo email domains. It does not delete
-- public.societies, public.communities, expense categories, or legacy_expenses.

BEGIN;

DO $$
BEGIN
  IF current_setting('cleanup.confirm', true) IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'refusing test-data cleanup; set cleanup.confirm=approved after review';
  END IF;
  IF (SELECT count(*) FROM public.societies) <> 1 THEN
    RAISE EXCEPTION 'refusing cleanup; expected exactly one society';
  END IF;
  IF (SELECT count(*) FROM public.residents) < 1 OR (SELECT count(*) FROM public.residents) > 10 THEN
    RAISE EXCEPTION 'refusing cleanup; resident count is outside the reviewed test set';
  END IF;
  IF EXISTS (SELECT 1 FROM public.residents WHERE created_at >= DATE '2026-11-20') THEN
    RAISE EXCEPTION 'refusing cleanup; a resident was created after the review';
  END IF;
END $$;

CREATE TEMP TABLE cleanup_residents ON COMMIT DROP AS
SELECT id, auth_user_id FROM public.residents;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'complaint_comments', 'complaint_votes', 'emergency_contacts', 'family_members',
    'forum_replies', 'forum_topics', 'harmony_scores', 'maintenance_tasks',
    'meeting_rsvps', 'move_history', 'notice_reads', 'pets', 'poll_votes',
    'resident_documents', 'user_roles', 'vehicles', 'volunteers', 'amenity_bookings',
    'campaign_joins', 'classifieds', 'committee_members', 'legacy_notifications'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'resident_id'
    ) THEN
      EXECUTE format(
        'DELETE FROM public.%I WHERE resident_id IN (SELECT id FROM cleanup_residents)',
        v_table
      );
    END IF;
  END LOOP;
END $$;

UPDATE public.complaints SET raised_by = NULL
WHERE raised_by IN (SELECT id FROM cleanup_residents);

UPDATE public.visitors SET approved_by = NULL
WHERE approved_by IN (SELECT id FROM cleanup_residents);

DELETE FROM public.payments
WHERE resident_id IN (SELECT id FROM cleanup_residents);

DELETE FROM public.invoices
WHERE resident_id IN (SELECT id FROM cleanup_residents);

DELETE FROM public.residents
WHERE id IN (SELECT id FROM cleanup_residents);

DELETE FROM public.community_memberships
WHERE profile_id IN (
  SELECT id FROM public.profiles
  WHERE lower(email) LIKE '%@societyos.app' OR lower(email) LIKE '%@demo.sabha.app'
);

DELETE FROM auth.users
WHERE id IN (SELECT auth_user_id FROM cleanup_residents WHERE auth_user_id IS NOT NULL)
   OR lower(email) LIKE '%@societyos.app'
   OR lower(email) LIKE '%@demo.sabha.app';

-- Review the remaining counts, then COMMIT. ROLLBACK leaves the database unchanged.
-- COMMIT;
ROLLBACK;
