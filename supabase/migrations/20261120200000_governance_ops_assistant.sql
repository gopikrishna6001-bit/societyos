-- Stage D/E: audit observations, staff, assets, settings updates,
-- payment gateway config boundary, permission-bound assistant facts.
-- Additive; community-scoped RLS.

-- ---------------------------------------------------------------------------
-- Audit observations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  subject_type text NOT NULL DEFAULT 'general'
    CHECK (subject_type IN ('general', 'expense', 'statement', 'collection', 'journal', 'bank')),
  subject_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'awaiting_response', 'responded', 'resolved', 'unresolved')),
  raised_by uuid NOT NULL REFERENCES public.profiles(id),
  response_body text,
  responded_by uuid REFERENCES public.profiles(id),
  responded_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_observations_community_idx
  ON public.audit_observations (community_id, status, created_at DESC);

ALTER TABLE public.audit_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_observations_read ON public.audit_observations;
CREATE POLICY audit_observations_read ON public.audit_observations FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['resident_auditor', 'treasurer', 'committee_admin', 'platform_admin'])
  OR (
    private.is_member(community_id)
    AND status IN ('resolved', 'unresolved')
  )
);

DROP POLICY IF EXISTS audit_observations_insert ON public.audit_observations;
CREATE POLICY audit_observations_insert ON public.audit_observations FOR INSERT TO authenticated
WITH CHECK (private.has_role(community_id, ARRAY['resident_auditor']) AND raised_by = auth.uid());

DROP POLICY IF EXISTS audit_observations_update ON public.audit_observations;
CREATE POLICY audit_observations_update ON public.audit_observations FOR UPDATE TO authenticated
USING (
  private.has_role(community_id, ARRAY['resident_auditor', 'treasurer', 'committee_admin', 'platform_admin'])
)
WITH CHECK (
  private.has_role(community_id, ARRAY['resident_auditor', 'treasurer', 'committee_admin', 'platform_admin'])
);

-- ---------------------------------------------------------------------------
-- Staff directory + attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role_title text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.community_staff(id) ON DELETE CASCADE,
  attended_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'leave', 'half_day')),
  notes text,
  marked_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, attended_on)
);

ALTER TABLE public.community_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_staff_read ON public.community_staff;
CREATE POLICY community_staff_read ON public.community_staff FOR SELECT TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer']));

DROP POLICY IF EXISTS community_staff_write ON public.community_staff;
CREATE POLICY community_staff_write ON public.community_staff FOR ALL TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']))
WITH CHECK (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']));

DROP POLICY IF EXISTS staff_attendance_read ON public.staff_attendance;
CREATE POLICY staff_attendance_read ON public.staff_attendance FOR SELECT TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer']));

DROP POLICY IF EXISTS staff_attendance_write ON public.staff_attendance;
CREATE POLICY staff_attendance_write ON public.staff_attendance FOR ALL TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']))
WITH CHECK (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']));

-- ---------------------------------------------------------------------------
-- Community assets (platform-scoped; separate from legacy society assets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  location text,
  vendor_name text,
  warranty_ends_on date,
  amc_ends_on date,
  status text NOT NULL DEFAULT 'operational'
    CHECK (status IN ('operational', 'under_maintenance', 'down', 'retired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, name)
);

ALTER TABLE public.community_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_assets_read ON public.community_assets;
CREATE POLICY community_assets_read ON public.community_assets FOR SELECT TO authenticated
USING (private.is_member(community_id));

DROP POLICY IF EXISTS community_assets_write ON public.community_assets;
CREATE POLICY community_assets_write ON public.community_assets FOR ALL TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer']))
WITH CHECK (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer']));

-- ---------------------------------------------------------------------------
-- Payment gateway configuration boundary (no secret key in client-readable cols)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  community_id uuid PRIMARY KEY REFERENCES public.communities(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay' CHECK (provider IN ('razorpay', 'none')),
  enabled boolean NOT NULL DEFAULT false,
  key_id text,
  webhook_configured boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'unconfigured'
    CHECK (mode IN ('unconfigured', 'test', 'live')),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_gateway_read ON public.payment_gateway_settings;
CREATE POLICY payment_gateway_read ON public.payment_gateway_settings FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer'])
  OR (private.is_member(community_id) AND enabled = true)
);

DROP POLICY IF EXISTS payment_gateway_write ON public.payment_gateway_settings;
CREATE POLICY payment_gateway_write ON public.payment_gateway_settings FOR ALL TO authenticated
USING (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']))
WITH CHECK (private.has_role(community_id, ARRAY['committee_admin', 'platform_admin']));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.raise_audit_observation(
  p_community uuid,
  p_title text,
  p_body text,
  p_subject_type text DEFAULT 'general',
  p_subject_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['resident_auditor']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF coalesce(trim(p_title), '') = '' OR coalesce(trim(p_body), '') = '' THEN
    RAISE EXCEPTION 'title and body are required';
  END IF;

  INSERT INTO public.audit_observations (
    community_id, subject_type, subject_id, title, body, status, raised_by
  ) VALUES (
    p_community,
    coalesce(nullif(p_subject_type, ''), 'general'),
    p_subject_id,
    trim(p_title),
    trim(p_body),
    'awaiting_response',
    auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (community_id, actor_id, action, entity, entity_id)
  VALUES (p_community, auth.uid(), 'raise', 'audit_observation', v_id);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_audit_observation(
  p_observation uuid,
  p_response text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.audit_observations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.audit_observations WHERE id = p_observation;
  IF NOT FOUND THEN RAISE EXCEPTION 'observation not found'; END IF;
  IF NOT private.has_role(v_row.community_id, ARRAY['treasurer', 'committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF coalesce(trim(p_response), '') = '' THEN
    RAISE EXCEPTION 'response is required';
  END IF;
  IF v_row.status IN ('resolved', 'unresolved') THEN
    RAISE EXCEPTION 'observation is closed';
  END IF;

  UPDATE public.audit_observations
  SET response_body = trim(p_response),
      responded_by = auth.uid(),
      responded_at = now(),
      status = 'responded',
      updated_at = now()
  WHERE id = p_observation;

  INSERT INTO public.audit_logs (community_id, actor_id, action, entity, entity_id)
  VALUES (v_row.community_id, auth.uid(), 'respond', 'audit_observation', p_observation);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_audit_observation(
  p_observation uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.audit_observations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.audit_observations WHERE id = p_observation;
  IF NOT FOUND THEN RAISE EXCEPTION 'observation not found'; END IF;
  IF NOT private.has_role(v_row.community_id, ARRAY['resident_auditor']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_status NOT IN ('resolved', 'unresolved') THEN
    RAISE EXCEPTION 'status must be resolved or unresolved';
  END IF;

  UPDATE public.audit_observations
  SET status = p_status,
      resolution_note = nullif(trim(coalesce(p_note, '')), ''),
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_observation;

  INSERT INTO public.audit_logs (community_id, actor_id, action, entity, entity_id, payload)
  VALUES (v_row.community_id, auth.uid(), 'resolve', 'audit_observation', p_observation,
          jsonb_build_object('status', p_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_community_settings(
  p_community uuid,
  p_treasurer_limit numeric,
  p_committee_limit numeric,
  p_statement_due_day integer,
  p_committee_quorum integer,
  p_auditor_seats integer,
  p_election_quorum_percent numeric,
  p_voting_unit text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_committee_limit < p_treasurer_limit THEN
    RAISE EXCEPTION 'committee limit must be at least the treasurer limit';
  END IF;
  IF p_statement_due_day < 1 OR p_statement_due_day > 28 THEN
    RAISE EXCEPTION 'statement due day must be between 1 and 28';
  END IF;
  IF p_auditor_seats < 1 THEN
    RAISE EXCEPTION 'auditor seats must be at least 1';
  END IF;
  IF p_voting_unit NOT IN ('unit', 'member') THEN
    RAISE EXCEPTION 'voting unit must be unit or member';
  END IF;

  UPDATE public.community_settings
  SET treasurer_approval_limit = p_treasurer_limit,
      committee_approval_limit = p_committee_limit,
      statement_due_day = p_statement_due_day,
      committee_quorum = greatest(p_committee_quorum, 1),
      auditor_seats = p_auditor_seats,
      election_quorum_percent = p_election_quorum_percent,
      voting_unit = p_voting_unit,
      updated_at = now()
  WHERE community_id = p_community;

  INSERT INTO public.audit_logs (community_id, actor_id, action, entity, entity_id, payload)
  VALUES (
    p_community, auth.uid(), 'update', 'community_settings', p_community,
    jsonb_build_object(
      'treasurer_approval_limit', p_treasurer_limit,
      'committee_approval_limit', p_committee_limit,
      'auditor_seats', p_auditor_seats,
      'voting_unit', p_voting_unit
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.configure_payment_gateway(
  p_community uuid,
  p_enabled boolean,
  p_key_id text DEFAULT NULL,
  p_mode text DEFAULT 'unconfigured',
  p_webhook_configured boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_mode NOT IN ('unconfigured', 'test', 'live') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;
  IF p_enabled AND coalesce(trim(p_key_id), '') = '' THEN
    RAISE EXCEPTION 'key id required when enabling gateway';
  END IF;
  -- Secret keys must never be stored here; only public key_id / flags.

  INSERT INTO public.payment_gateway_settings (
    community_id, provider, enabled, key_id, webhook_configured, mode, updated_by, updated_at
  ) VALUES (
    p_community, 'razorpay', coalesce(p_enabled, false),
    nullif(trim(coalesce(p_key_id, '')), ''),
    coalesce(p_webhook_configured, false),
    p_mode, auth.uid(), now()
  )
  ON CONFLICT (community_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    key_id = EXCLUDED.key_id,
    webhook_configured = EXCLUDED.webhook_configured,
    mode = EXCLUDED.mode,
    updated_by = auth.uid(),
    updated_at = now();

  INSERT INTO public.audit_logs (community_id, actor_id, action, entity, entity_id, payload)
  VALUES (
    p_community, auth.uid(), 'configure', 'payment_gateway', p_community,
    jsonb_build_object('enabled', p_enabled, 'mode', p_mode, 'webhook_configured', p_webhook_configured)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_staff_attendance(
  p_staff uuid,
  p_date date,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community uuid;
  v_id uuid;
BEGIN
  SELECT community_id INTO v_community FROM public.community_staff WHERE id = p_staff;
  IF v_community IS NULL THEN RAISE EXCEPTION 'staff not found'; END IF;
  IF NOT private.has_role(v_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_status NOT IN ('present', 'absent', 'leave', 'half_day') THEN
    RAISE EXCEPTION 'invalid attendance status';
  END IF;

  INSERT INTO public.staff_attendance (community_id, staff_id, attended_on, status, notes, marked_by)
  VALUES (v_community, p_staff, coalesce(p_date, CURRENT_DATE), p_status, nullif(trim(coalesce(p_notes, '')), ''), auth.uid())
  ON CONFLICT (staff_id, attended_on) DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    marked_by = auth.uid()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.society_assistant_facts(p_community uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_financial boolean;
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_financial := private.has_role(
    p_community,
    ARRAY['treasurer', 'resident_auditor', 'committee_admin', 'platform_admin']
  );

  v_result := v_result || jsonb_build_object(
    'open_public_concerns', (
      SELECT count(*) FROM public.tickets
      WHERE community_id = p_community
        AND visibility = 'public'
        AND status NOT IN ('closed', 'rejected', 'resolved')
    ),
    'my_open_concerns', (
      SELECT count(*) FROM public.tickets
      WHERE community_id = p_community
        AND created_by = auth.uid()
        AND status NOT IN ('closed', 'rejected')
    ),
    'upcoming_meetings', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('title', title, 'held_on', held_on) ORDER BY held_on), '[]'::jsonb)
      FROM (
        SELECT title, held_on FROM public.meetings
        WHERE community_id = p_community AND held_on >= now()
        ORDER BY held_on LIMIT 5
      ) m
    ),
    'published_notices', (
      SELECT count(*) FROM public.community_notices
      WHERE community_id = p_community AND published_at IS NOT NULL AND archived_at IS NULL
    ),
    'verified', true,
    'source', 'society_assistant_facts'
  );

  IF v_financial THEN
    v_result := v_result || jsonb_build_object(
      'pending_expenses', (
        SELECT count(*) FROM public.expenses
        WHERE community_id = p_community AND approval_status = 'pending'
      ),
      'pending_payment_proofs', (
        SELECT count(*) FROM public.payment_proofs
        WHERE community_id = p_community AND status = 'pending'
      ),
      'open_audit_observations', (
        SELECT count(*) FROM public.audit_observations
        WHERE community_id = p_community AND status IN ('open', 'awaiting_response', 'responded')
      ),
      'latest_statement', (
        SELECT jsonb_build_object('status', status, 'period_end', period_end, 'due_on', due_on)
        FROM public.financial_statements
        WHERE community_id = p_community
        ORDER BY period_end DESC LIMIT 1
      ),
      'fund_balances', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'name', b.name,
          'closing', b.closing
        )), '[]'::jsonb)
        FROM public.account_balances(p_community) b
      )
    );
  ELSE
    v_result := v_result || jsonb_build_object(
      'financial_detail', 'restricted',
      'note', 'Fund and ledger detail is available to treasurer, auditor, and committee roles.'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Extend action centre with audit observations.
CREATE OR REPLACE FUNCTION public.action_centre(p_community uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'module', 'concerns',
    'title', t.ticket_number || ': ' || t.subject,
    'status', t.status,
    'due_on', NULL,
    'action', 'Open concern',
    'page', 'concerns'
  ) ORDER BY t.updated_at DESC), '[]'::jsonb)
  INTO v_items
  FROM public.tickets t
  WHERE t.community_id = p_community
    AND t.created_by = auth.uid()
    AND t.status NOT IN ('closed', 'rejected');

  IF private.has_role(p_community, ARRAY['treasurer']) THEN
    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'module', 'payments',
        'title', 'Verify payment proof · ' || to_char(p.amount, 'FM9999990.00'),
        'status', p.status,
        'due_on', p.paid_on,
        'action', 'Review proof',
        'page', 'collections'
      ) ORDER BY p.created_at)
      FROM public.payment_proofs p
      WHERE p.community_id = p_community AND p.status = 'pending'
    ), '[]'::jsonb);

    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'module', 'audit',
        'title', 'Respond to audit observation · ' || o.title,
        'status', o.status,
        'due_on', o.created_at::date,
        'action', 'Respond',
        'page', 'reviews'
      ) ORDER BY o.created_at)
      FROM public.audit_observations o
      WHERE o.community_id = p_community AND o.status IN ('awaiting_response', 'open')
    ), '[]'::jsonb);
  END IF;

  IF private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'module', 'concerns',
        'title', 'Committee: ' || t.ticket_number || ' · ' || t.subject,
        'status', t.status,
        'due_on', NULL,
        'action', 'Update status',
        'page', 'concerns'
      ) ORDER BY t.updated_at DESC)
      FROM public.tickets t
      WHERE t.community_id = p_community
        AND t.status IN ('open', 'assigned', 'in_progress', 'awaiting_resident', 'on_hold')
      LIMIT 20
    ), '[]'::jsonb);

    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'module', 'expenses',
        'title', 'Expense awaiting decision · ' || e.expense_number,
        'status', e.approval_status,
        'due_on', e.occurred_on,
        'action', 'Decide',
        'page', 'expenses'
      ))
      FROM public.expenses e
      WHERE e.community_id = p_community AND e.approval_status = 'pending'
    ), '[]'::jsonb);
  END IF;

  IF private.has_role(p_community, ARRAY['resident_auditor']) THEN
    v_items := v_items || COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'module', 'audit',
        'title', 'Observation needs closure · ' || o.title,
        'status', o.status,
        'due_on', o.created_at::date,
        'action', 'Resolve',
        'page', 'reviews'
      ))
      FROM public.audit_observations o
      WHERE o.community_id = p_community AND o.status = 'responded'
    ), '[]'::jsonb);
  END IF;

  v_items := v_items || COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.demand_id,
      'module', 'payments',
      'title', 'Outstanding dues · unit ' || d.unit_number || ' · ' || to_char(d.outstanding_amount, 'FM9999990.00'),
      'status', 'outstanding',
      'due_on', d.due_on,
      'action', 'Pay / submit proof',
      'page', 'finance'
    ))
    FROM public.my_unit_demands(p_community) d
    WHERE d.outstanding_amount > 0
  ), '[]'::jsonb);

  v_items := v_items || COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', m.id,
      'module', 'meetings',
      'title', 'Meeting: ' || m.title,
      'status', 'scheduled',
      'due_on', m.held_on::date,
      'action', 'Open meetings',
      'page', 'decisions'
    ))
    FROM (
      SELECT id, title, held_on FROM public.meetings
      WHERE community_id = p_community AND held_on >= now()
      ORDER BY held_on LIMIT 5
    ) m
  ), '[]'::jsonb);

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.raise_audit_observation(uuid, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_audit_observation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_audit_observation(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_community_settings(uuid, numeric, numeric, integer, integer, integer, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.configure_payment_gateway(uuid, boolean, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_staff_attendance(uuid, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.society_assistant_facts(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.action_centre(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.raise_audit_observation(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_audit_observation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_audit_observation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_community_settings(uuid, numeric, numeric, integer, integer, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.configure_payment_gateway(uuid, boolean, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_staff_attendance(uuid, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.society_assistant_facts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.action_centre(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_observations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateway_settings TO authenticated;
