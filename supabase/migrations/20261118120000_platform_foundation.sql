-- Apartment Transparency & Accountability Platform
-- Fresh Supabase project only. Do not also run supabase/schema.sql.
-- Money is numeric. Balances are derived from journal lines.
-- Writes to the ledger go through private functions, not table grants.

CREATE SCHEMA IF NOT EXISTS private;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_settings (
  community_id uuid PRIMARY KEY REFERENCES public.communities(id),
  financial_year_start_month integer NOT NULL DEFAULT 4 CHECK (financial_year_start_month BETWEEN 1 AND 12),
  statement_due_day integer NOT NULL DEFAULT 10 CHECK (statement_due_day BETWEEN 1 AND 28),
  treasurer_approval_limit numeric(14,2) NOT NULL CHECK (treasurer_approval_limit >= 0),
  committee_approval_limit numeric(14,2) NOT NULL CHECK (committee_approval_limit >= treasurer_approval_limit),
  committee_quorum integer NOT NULL DEFAULT 1 CHECK (committee_quorum > 0),
  auditor_seats integer NOT NULL DEFAULT 1 CHECK (auditor_seats > 0),
  auditor_term_months integer NOT NULL DEFAULT 12 CHECK (auditor_term_months > 0),
  election_quorum_percent numeric(5,2) NOT NULL DEFAULT 50 CHECK (election_quorum_percent > 0 AND election_quorum_percent <= 100),
  voting_unit text NOT NULL DEFAULT 'unit' CHECK (voting_unit IN ('unit', 'member')),
  emergency_pay_before_approval boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  block text,
  number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, number)
);

CREATE TABLE public.unit_occupancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  relationship text NOT NULL CHECK (relationship IN ('owner', 'tenant')),
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  ended_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL CHECK (role IN ('platform_admin', 'committee_admin', 'treasurer', 'resident_auditor', 'resident')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, profile_id, role)
);

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  label text NOT NULL,
  masked_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  account_type text NOT NULL CHECK (account_type IN ('fund', 'bank')),
  fund_kind text CHECK (
    (account_type = 'fund' AND fund_kind IN ('maintenance', 'corpus', 'special', 'emergency', 'other'))
    OR (account_type = 'bank' AND fund_kind IS NULL)
  ),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, code)
);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  entry_type text NOT NULL CHECK (entry_type IN ('opening', 'receipt', 'payment', 'transfer', 'adjustment', 'reversal')),
  occurred_on date NOT NULL,
  narration text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  reverses_entry_id uuid REFERENCES public.journal_entries(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, idempotency_key)
);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (community_id, name)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  expense_number text NOT NULL,
  occurred_on date NOT NULL,
  fund_account_id uuid NOT NULL REFERENCES public.accounts(id),
  category_id uuid NOT NULL REFERENCES public.expense_categories(id),
  description text NOT NULL,
  payee text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_mode text,
  payment_reference text,
  is_emergency boolean NOT NULL DEFAULT false,
  emergency_justification text,
  resolution_id uuid,
  submitted_by uuid NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  auditor_status text NOT NULL DEFAULT 'pending' CHECK (auditor_status IN ('pending', 'verified', 'clarification_required', 'disputed', 'resolved')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, expense_number),
  CHECK (NOT is_emergency OR emergency_justification IS NOT NULL)
);

CREATE TABLE public.expense_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id),
  approver_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comments text,
  amount numeric(14,2) NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collection_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  financial_year text NOT NULL,
  period_month date NOT NULL,
  due_on date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, period_month)
);

CREATE TABLE public.maintenance_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  period_id uuid NOT NULL REFERENCES public.collection_periods(id),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  expected_amount numeric(14,2) NOT NULL CHECK (expected_amount >= 0),
  additional_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (additional_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, unit_id)
);

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  demand_id uuid NOT NULL REFERENCES public.maintenance_demands(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL,
  payment_mode text NOT NULL,
  bank_reference text,
  receipt_number text NOT NULL,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id),
  idempotency_key text NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, idempotency_key),
  UNIQUE (community_id, receipt_number)
);

CREATE TABLE public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  bank_account_id uuid NOT NULL REFERENCES public.accounts(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  opening_balance numeric(14,2) NOT NULL,
  closing_balance numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reconciled')),
  difference numeric(14,2),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES public.bank_reconciliations(id),
  line_date date NOT NULL,
  description text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  matched_entry_id uuid REFERENCES public.journal_entries(id)
);

CREATE TABLE public.financial_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_on date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted_for_review', 'review_in_progress', 'clarification_required',
    'reconciled_and_reviewed', 'published', 'published_with_exceptions', 'overdue'
  )),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, period_start, period_end)
);

CREATE TABLE public.financial_statement_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.financial_statements(id),
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  published_by uuid NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (statement_id, version_number)
);

CREATE TABLE public.audit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'verified', 'clarification_required', 'disputed', 'resolved')),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Auditors, concerns, governance, documents, notifications
-- ---------------------------------------------------------------------------

CREATE TABLE public.auditor_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  seats integer NOT NULL CHECK (seats > 0),
  term_starts_on date NOT NULL,
  term_ends_on date NOT NULL,
  voting_starts_on date NOT NULL,
  voting_ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'certified', 'failed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.auditor_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.auditor_elections(id),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id),
  cast_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, unit_id)
);

CREATE TABLE public.auditor_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  election_id uuid NOT NULL REFERENCES public.auditor_elections(id),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'replaced')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  ticket_number text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('public', 'private')),
  unit_id uuid REFERENCES public.units(id),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  assigned_to uuid,
  expected_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, ticket_number)
);

CREATE TABLE public.ticket_counters (
  community_id uuid NOT NULL REFERENCES public.communities(id),
  year integer NOT NULL,
  last_value integer NOT NULL,
  PRIMARY KEY (community_id, year)
);

CREATE TABLE public.ticket_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id),
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id),
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  meeting_type text NOT NULL CHECK (meeting_type IN ('committee', 'general_body', 'emergency', 'special')),
  title text NOT NULL,
  held_on timestamptz NOT NULL,
  venue text,
  minutes text,
  created_by uuid NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  meeting_id uuid REFERENCES public.meetings(id),
  title text NOT NULL,
  description text NOT NULL,
  proposed_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'under_discussion', 'approved', 'rejected', 'deferred', 'in_progress', 'implemented'
  )),
  voting_starts_at timestamptz,
  voting_ends_at timestamptz,
  responsible_id uuid,
  implementation_due date,
  result_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.resolution_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id uuid NOT NULL REFERENCES public.resolutions(id),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  voter_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resolution_id, unit_id)
);

CREATE TABLE public.contribution_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  resolution_id uuid REFERENCES public.resolutions(id),
  purpose text NOT NULL,
  estimated_cost numeric(14,2) NOT NULL CHECK (estimated_cost >= 0),
  per_unit_amount numeric(14,2) NOT NULL CHECK (per_unit_amount >= 0),
  applicable_units integer NOT NULL CHECK (applicable_units > 0),
  deadline date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  related_type text,
  related_id uuid,
  access_class text NOT NULL CHECK (access_class IN ('public', 'committee', 'private_unit')),
  redacted boolean NOT NULL DEFAULT false,
  unit_id uuid REFERENCES public.units(id),
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id),
  version_number integer NOT NULL,
  storage_path text NOT NULL,
  redacted boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid,
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX accounts_community_idx ON public.accounts (community_id);
CREATE INDEX journal_entries_community_idx ON public.journal_entries (community_id, occurred_on);
CREATE INDEX journal_lines_entry_idx ON public.journal_lines (entry_id);
CREATE INDEX journal_lines_account_idx ON public.journal_lines (account_id);
CREATE INDEX expenses_community_idx ON public.expenses (community_id, occurred_on);
CREATE INDEX demands_unit_idx ON public.maintenance_demands (unit_id);
CREATE INDEX tickets_community_idx ON public.tickets (community_id, status);
CREATE INDEX memberships_profile_idx ON public.community_memberships (profile_id);

-- ---------------------------------------------------------------------------
-- Authorization helpers. Security definer so policies do not recurse.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.has_role(p_community uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships m
    WHERE m.community_id = p_community
      AND m.profile_id = auth.uid()
      AND m.status = 'active'
      AND m.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_member(p_community uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(p_community, ARRAY['platform_admin', 'committee_admin', 'treasurer', 'resident_auditor', 'resident']);
$$;

CREATE OR REPLACE FUNCTION private.occupies(p_unit uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unit_occupancies o
    WHERE o.unit_id = p_unit
      AND o.profile_id = auth.uid()
      AND o.ended_on IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER expenses_touch BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER statements_touch BEFORE UPDATE ON public.financial_statements
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER tickets_touch BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE OR REPLACE FUNCTION private.reject_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'posted financial records are immutable';
END;
$$;

CREATE TRIGGER journal_entries_immutable
BEFORE UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION private.reject_ledger_mutation();

CREATE TRIGGER journal_lines_immutable
BEFORE UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION private.reject_ledger_mutation();

CREATE TRIGGER statement_versions_immutable
BEFORE UPDATE OR DELETE ON public.financial_statement_versions
FOR EACH ROW EXECUTE FUNCTION private.reject_ledger_mutation();

CREATE OR REPLACE FUNCTION private.write_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community uuid;
  v_id uuid;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  BEGIN
    v_community := COALESCE(NEW.community_id, OLD.community_id);
  EXCEPTION WHEN undefined_column THEN
    v_community := NULL;
  END;
  INSERT INTO public.audit_logs (community_id, actor_id, action, entity, entity_id)
  VALUES (v_community, auth.uid(), TG_OP, TG_TABLE_NAME, v_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER expenses_audit
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION private.write_audit();

CREATE TRIGGER tickets_audit
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION private.write_audit();

-- ---------------------------------------------------------------------------
-- Ledger posting
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.post_journal(
  p_community uuid,
  p_type text,
  p_date date,
  p_narration text,
  p_key text,
  p_lines jsonb,
  p_reverses uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_hash text;
  v_stored text;
  v_id uuid;
  v_debit numeric(14,2) := 0;
  v_credit numeric(14,2) := 0;
  v_line jsonb;
  v_amount numeric(14,2);
  v_direction text;
  v_account uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_type NOT IN ('opening', 'receipt', 'payment', 'transfer', 'adjustment', 'reversal') THEN
    RAISE EXCEPTION 'invalid entry type';
  END IF;
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RAISE EXCEPTION 'idempotency key required';
  END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'journal entry must have at least two lines';
  END IF;

  v_hash := md5(p_type || '|' || p_date::text || '|' || p_narration || '|' || p_lines::text);
  SELECT id, request_hash INTO v_existing, v_stored
  FROM public.journal_entries
  WHERE community_id = p_community AND idempotency_key = p_key;
  IF v_existing IS NOT NULL THEN
    IF v_stored IS DISTINCT FROM v_hash THEN
      RAISE EXCEPTION 'idempotency key reused with a different payload';
    END IF;
    RETURN v_existing;
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_account := (v_line->>'account_id')::uuid;
    v_direction := v_line->>'direction';
    v_amount := (v_line->>'amount')::numeric(14,2);
    IF v_direction NOT IN ('debit', 'credit') THEN
      RAISE EXCEPTION 'invalid direction';
    END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'amount must be positive';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_account AND community_id = p_community) THEN
      RAISE EXCEPTION 'account is not in this community';
    END IF;
    IF v_direction = 'debit' THEN
      v_debit := v_debit + v_amount;
    ELSE
      v_credit := v_credit + v_amount;
    END IF;
  END LOOP;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'journal entry is not balanced';
  END IF;

  INSERT INTO public.journal_entries (
    community_id, entry_type, occurred_on, narration, idempotency_key, request_hash, reverses_entry_id, created_by
  ) VALUES (
    p_community, p_type, p_date, p_narration, p_key, v_hash, p_reverses, auth.uid()
  ) RETURNING id INTO v_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.journal_lines (entry_id, account_id, direction, amount)
    VALUES (v_id, (v_line->>'account_id')::uuid, v_line->>'direction', (v_line->>'amount')::numeric(14,2));
  END LOOP;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_journal(
  p_community uuid,
  p_type text,
  p_date date,
  p_narration text,
  p_key text,
  p_lines jsonb
) RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.post_journal(p_community, p_type, p_date, p_narration, p_key, p_lines, NULL);
$$;

CREATE OR REPLACE FUNCTION public.account_balances(p_community uuid)
RETURNS TABLE (
  account_id uuid,
  code text,
  name text,
  account_type text,
  fund_kind text,
  opening numeric,
  receipts numeric,
  payments numeric,
  transfers_in numeric,
  transfers_out numeric,
  adjustment_net numeric,
  closing numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    a.fund_kind,
    COALESCE(SUM(CASE WHEN e.entry_type = 'opening' AND l.direction = 'credit' THEN l.amount WHEN e.entry_type = 'opening' AND l.direction = 'debit' THEN -l.amount ELSE 0 END), 0)::numeric(14,2),
    COALESCE(SUM(CASE WHEN e.entry_type = 'receipt' AND l.direction = 'credit' THEN l.amount ELSE 0 END), 0)::numeric(14,2),
    COALESCE(SUM(CASE WHEN e.entry_type = 'payment' AND l.direction = 'debit' THEN l.amount ELSE 0 END), 0)::numeric(14,2),
    COALESCE(SUM(CASE WHEN e.entry_type = 'transfer' AND l.direction = 'credit' THEN l.amount ELSE 0 END), 0)::numeric(14,2),
    COALESCE(SUM(CASE WHEN e.entry_type = 'transfer' AND l.direction = 'debit' THEN l.amount ELSE 0 END), 0)::numeric(14,2),
    COALESCE(SUM(CASE WHEN e.entry_type IN ('adjustment', 'reversal') AND l.direction = 'credit' THEN l.amount WHEN e.entry_type IN ('adjustment', 'reversal') AND l.direction = 'debit' THEN -l.amount ELSE 0 END), 0)::numeric(14,2),
    COALESCE(SUM(CASE WHEN l.direction = 'credit' THEN l.amount ELSE -l.amount END), 0)::numeric(14,2)
  FROM public.accounts a
  LEFT JOIN public.journal_lines l ON l.account_id = a.id
  LEFT JOIN public.journal_entries e ON e.id = l.entry_id
  WHERE a.community_id = p_community
    AND a.account_type = 'fund'
  GROUP BY a.id, a.code, a.name, a.account_type, a.fund_kind;
END;
$$;

-- Bank balances are debit-normal and exposed without account numbers.
CREATE OR REPLACE FUNCTION public.bank_balances(p_community uuid)
RETURNS TABLE (account_id uuid, name text, book_balance numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT a.id, a.name,
    COALESCE(SUM(CASE WHEN l.direction = 'debit' THEN l.amount ELSE -l.amount END), 0)::numeric(14,2)
  FROM public.accounts a
  LEFT JOIN public.journal_lines l ON l.account_id = a.id
  WHERE a.community_id = p_community AND a.account_type = 'bank'
  GROUP BY a.id, a.name;
END;
$$;

-- ---------------------------------------------------------------------------
-- Community setup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE OR REPLACE FUNCTION private.notify_members(p_community uuid, p_event text, p_title text, p_body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
  SELECT DISTINCT p_community, m.profile_id, p_event, p_title, p_body
  FROM public.community_memberships m
  WHERE m.community_id = p_community AND m.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_community(
  p_name text,
  p_address text,
  p_city text,
  p_treasurer_limit numeric,
  p_committee_limit numeric,
  p_statement_due_day integer DEFAULT 10
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'community name is required';
  END IF;
  IF p_treasurer_limit IS NULL OR p_committee_limit IS NULL THEN
    RAISE EXCEPTION 'approval limits are required';
  END IF;
  IF p_committee_limit < p_treasurer_limit THEN
    RAISE EXCEPTION 'committee limit cannot be below the treasurer limit';
  END IF;

  INSERT INTO public.communities (name, address, city, created_by)
  VALUES (btrim(p_name), p_address, p_city, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.community_settings (
    community_id, treasurer_approval_limit, committee_approval_limit, statement_due_day
  ) VALUES (
    v_id, p_treasurer_limit, p_committee_limit, COALESCE(p_statement_due_day, 10)
  );

  INSERT INTO public.community_memberships (community_id, profile_id, role, created_by)
  VALUES
    (v_id, auth.uid(), 'platform_admin', auth.uid()),
    (v_id, auth.uid(), 'committee_admin', auth.uid()),
    (v_id, auth.uid(), 'treasurer', auth.uid());

  INSERT INTO public.expense_categories (community_id, name)
  SELECT v_id, name FROM (VALUES
    ('Security'), ('Housekeeping'), ('Electricity'), ('Water'), ('Lift maintenance'),
    ('Plumbing'), ('Civil repairs'), ('Gardening'), ('Administration'), ('Insurance'),
    ('Emergency repairs'), ('Other')
  ) AS names(name);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_role(p_community uuid, p_email text, p_role text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid;
  v_id uuid;
BEGIN
  IF p_role = 'resident_auditor' THEN
    RAISE EXCEPTION 'resident auditors are elected, not appointed';
  END IF;
  IF p_role NOT IN ('platform_admin', 'committee_admin', 'treasurer', 'resident') THEN
    RAISE EXCEPTION 'unknown role';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT id INTO v_profile FROM public.profiles WHERE lower(email) = lower(p_email);
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'that person has not registered yet';
  END IF;
  INSERT INTO public.community_memberships (community_id, profile_id, role, created_by)
  VALUES (p_community, v_profile, p_role, auth.uid())
  ON CONFLICT (community_id, profile_id, role)
  DO UPDATE SET status = 'active'
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_unit(p_community uuid, p_block text, p_number text)
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
  INSERT INTO public.units (community_id, block, number)
  VALUES (p_community, NULLIF(btrim(COALESCE(p_block, '')), ''), btrim(p_number))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_occupancy(
  p_community uuid,
  p_unit_number text,
  p_email text,
  p_relationship text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit uuid;
  v_profile uuid;
  v_id uuid;
BEGIN
  IF p_relationship NOT IN ('owner', 'tenant') THEN
    RAISE EXCEPTION 'relationship must be owner or tenant';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT id INTO v_unit FROM public.units WHERE community_id = p_community AND number = p_unit_number;
  IF v_unit IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;
  SELECT id INTO v_profile FROM public.profiles WHERE lower(email) = lower(p_email);
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'that person has not registered yet';
  END IF;
  INSERT INTO public.unit_occupancies (community_id, unit_id, profile_id, relationship)
  VALUES (p_community, v_unit, v_profile, p_relationship)
  RETURNING id INTO v_id;
  PERFORM public.grant_role(p_community, p_email, 'resident');
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_bank_account(p_community uuid, p_label text, p_masked text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank uuid;
  v_account uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['treasurer', 'committee_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.bank_accounts (community_id, label, masked_number)
  VALUES (p_community, btrim(p_label), p_masked)
  RETURNING id INTO v_bank;
  INSERT INTO public.accounts (community_id, code, name, account_type, bank_account_id)
  VALUES (p_community, 'bank-' || left(v_bank::text, 8), btrim(p_label), 'bank', v_bank)
  RETURNING id INTO v_account;
  RETURN v_account;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_fund(
  p_community uuid,
  p_code text,
  p_name text,
  p_kind text,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_kind NOT IN ('maintenance', 'corpus', 'special', 'emergency', 'other') THEN
    RAISE EXCEPTION 'unknown fund kind';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['treasurer', 'committee_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.accounts (community_id, code, name, description, account_type, fund_kind)
  VALUES (p_community, btrim(p_code), btrim(p_name), p_description, 'fund', p_kind)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Collections and expenses
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.open_collection_period(
  p_community uuid,
  p_financial_year text,
  p_month date,
  p_due_on date,
  p_amount numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'maintenance amount is required';
  END IF;
  INSERT INTO public.collection_periods (community_id, financial_year, period_month, due_on, created_by)
  VALUES (p_community, p_financial_year, date_trunc('month', p_month)::date, p_due_on, auth.uid())
  RETURNING id INTO v_period;
  INSERT INTO public.maintenance_demands (community_id, period_id, unit_id, expected_amount)
  SELECT p_community, v_period, u.id, p_amount
  FROM public.units u
  WHERE u.community_id = p_community;
  RETURN v_period;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_collection(
  p_demand uuid,
  p_amount numeric,
  p_paid_on date,
  p_mode text,
  p_bank_reference text,
  p_receipt_number text,
  p_key text,
  p_bank_account uuid,
  p_fund_account uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.maintenance_demands%ROWTYPE;
  v_entry uuid;
  v_id uuid;
  v_outstanding numeric(14,2);
BEGIN
  SELECT * INTO v_demand FROM public.maintenance_demands WHERE id = p_demand;
  IF v_demand.id IS NULL THEN
    RAISE EXCEPTION 'demand not found';
  END IF;
  IF NOT private.has_role(v_demand.community_id, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT v_demand.expected_amount + v_demand.additional_amount - COALESCE(SUM(amount), 0)
  INTO v_outstanding
  FROM public.collections WHERE demand_id = p_demand;
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'collection exceeds the outstanding demand';
  END IF;

  v_entry := private.post_journal(
    v_demand.community_id,
    'receipt',
    p_paid_on,
    'Maintenance receipt ' || p_receipt_number,
    p_key,
    jsonb_build_array(
      jsonb_build_object('account_id', p_bank_account, 'direction', 'debit', 'amount', p_amount),
      jsonb_build_object('account_id', p_fund_account, 'direction', 'credit', 'amount', p_amount)
    ),
    NULL
  );

  INSERT INTO public.collections (
    community_id, demand_id, amount, paid_on, payment_mode, bank_reference,
    receipt_number, journal_entry_id, idempotency_key, recorded_by
  ) VALUES (
    v_demand.community_id, p_demand, p_amount, p_paid_on, p_mode, NULLIF(p_bank_reference, ''),
    p_receipt_number, v_entry, p_key, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_id FROM public.collections
    WHERE community_id = v_demand.community_id AND idempotency_key = p_key;
    IF v_id IS NULL THEN
      RAISE;
    END IF;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.collection_summary(p_community uuid, p_period uuid)
RETURNS TABLE (
  expected numeric,
  collected numeric,
  outstanding numeric,
  paid_units integer,
  partial_units integer,
  unpaid_units integer,
  collection_percent numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  WITH demand AS (
    SELECT d.id,
      d.expected_amount + d.additional_amount AS due,
      COALESCE(SUM(c.amount), 0) AS paid
    FROM public.maintenance_demands d
    LEFT JOIN public.collections c ON c.demand_id = d.id
    WHERE d.community_id = p_community AND d.period_id = p_period
    GROUP BY d.id, d.expected_amount, d.additional_amount
  )
  SELECT
    COALESCE(SUM(due), 0)::numeric(14,2),
    COALESCE(SUM(paid), 0)::numeric(14,2),
    COALESCE(SUM(due - paid), 0)::numeric(14,2),
    COUNT(*) FILTER (WHERE paid >= due AND due > 0)::integer,
    COUNT(*) FILTER (WHERE paid > 0 AND paid < due)::integer,
    COUNT(*) FILTER (WHERE paid = 0)::integer,
    CASE WHEN COALESCE(SUM(due), 0) = 0 THEN 0
      ELSE round(SUM(paid) / SUM(due) * 100, 2)
    END
  FROM demand;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_expense(
  p_community uuid,
  p_date date,
  p_fund uuid,
  p_category text,
  p_description text,
  p_payee text,
  p_amount numeric,
  p_emergency boolean DEFAULT false,
  p_justification text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category uuid;
  v_number text;
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_emergency AND (p_justification IS NULL OR btrim(p_justification) = '') THEN
    RAISE EXCEPTION 'emergency expenses require a justification';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_fund AND community_id = p_community AND account_type = 'fund'
  ) THEN
    RAISE EXCEPTION 'fund not found';
  END IF;
  SELECT id INTO v_category
  FROM public.expense_categories
  WHERE community_id = p_community AND lower(name) = lower(p_category) AND active;
  IF v_category IS NULL THEN
    RAISE EXCEPTION 'unknown expense category';
  END IF;
  v_number := 'EXP-' || to_char(p_date, 'YYYY') || '-' || left(gen_random_uuid()::text, 8);
  INSERT INTO public.expenses (
    community_id, expense_number, occurred_on, fund_account_id, category_id,
    description, payee, amount, is_emergency, emergency_justification, submitted_by
  ) VALUES (
    p_community, v_number, p_date, p_fund, v_category,
    btrim(p_description), btrim(p_payee), p_amount, COALESCE(p_emergency, false), NULLIF(p_justification, ''), auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_expense(p_expense uuid, p_decision text, p_comments text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense public.expenses%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_approvals integer;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected';
  END IF;
  SELECT * INTO v_expense FROM public.expenses WHERE id = p_expense;
  IF v_expense.id IS NULL THEN
    RAISE EXCEPTION 'expense not found';
  END IF;
  IF v_expense.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'expense is not awaiting approval';
  END IF;
  SELECT * INTO v_settings FROM public.community_settings WHERE community_id = v_expense.community_id;

  IF v_expense.amount <= v_settings.treasurer_approval_limit THEN
    IF NOT private.has_role(v_expense.community_id, ARRAY['treasurer']) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  ELSIF v_expense.amount <= v_settings.committee_approval_limit THEN
    IF private.has_role(v_expense.community_id, ARRAY['treasurer'])
       AND NOT private.has_role(v_expense.community_id, ARRAY['committee_admin']) THEN
      RAISE EXCEPTION 'treasurer cannot approve expenses beyond the configured limit';
    END IF;
    IF NOT private.has_role(v_expense.community_id, ARRAY['committee_admin']) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  ELSE
    IF v_expense.resolution_id IS NULL THEN
      RAISE EXCEPTION 'this amount requires an approved resolution';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.resolutions
      WHERE id = v_expense.resolution_id AND status = 'approved' AND community_id = v_expense.community_id
    ) THEN
      RAISE EXCEPTION 'this amount requires an approved resolution';
    END IF;
    IF NOT private.has_role(v_expense.community_id, ARRAY['committee_admin']) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  END IF;

  INSERT INTO public.expense_approvals (expense_id, approver_id, decision, comments, amount)
  VALUES (p_expense, auth.uid(), p_decision, NULLIF(p_comments, ''), v_expense.amount);

  IF p_decision = 'rejected' OR v_expense.amount <= v_settings.treasurer_approval_limit THEN
    UPDATE public.expenses SET approval_status = p_decision WHERE id = p_expense;
    RETURN;
  END IF;

  SELECT COUNT(DISTINCT approver_id) INTO v_approvals
  FROM public.expense_approvals
  WHERE expense_id = p_expense AND decision = 'approved';

  IF v_approvals >= v_settings.committee_quorum THEN
    UPDATE public.expenses SET approval_status = 'approved' WHERE id = p_expense;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_expense(
  p_expense uuid,
  p_bank_account uuid,
  p_mode text,
  p_reference text,
  p_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense public.expenses%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_entry uuid;
BEGIN
  SELECT * INTO v_expense FROM public.expenses WHERE id = p_expense;
  IF v_expense.id IS NULL THEN
    RAISE EXCEPTION 'expense not found';
  END IF;
  IF NOT private.has_role(v_expense.community_id, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO v_settings FROM public.community_settings WHERE community_id = v_expense.community_id;
  IF v_expense.payment_status = 'paid' THEN
    RETURN v_expense.journal_entry_id;
  END IF;
  IF v_expense.approval_status <> 'approved' THEN
    IF NOT (v_expense.is_emergency AND v_settings.emergency_pay_before_approval) THEN
      RAISE EXCEPTION 'expense is not approved';
    END IF;
  END IF;

  v_entry := private.post_journal(
    v_expense.community_id,
    'payment',
    v_expense.occurred_on,
    'Expense ' || v_expense.expense_number || ' ' || v_expense.payee,
    p_key,
    jsonb_build_array(
      jsonb_build_object('account_id', v_expense.fund_account_id, 'direction', 'debit', 'amount', v_expense.amount),
      jsonb_build_object('account_id', p_bank_account, 'direction', 'credit', 'amount', v_expense.amount)
    ),
    NULL
  );
  UPDATE public.expenses
  SET payment_status = 'paid',
      payment_mode = p_mode,
      payment_reference = p_reference,
      journal_entry_id = v_entry
  WHERE id = p_expense;
  RETURN v_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_subject(
  p_community uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_status text,
  p_comments text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_submitter uuid;
BEGIN
  IF p_status NOT IN ('verified', 'clarification_required', 'disputed', 'resolved') THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['resident_auditor']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_subject_type = 'expense' THEN
    SELECT submitted_by INTO v_submitter FROM public.expenses WHERE id = p_subject_id AND community_id = p_community;
    IF v_submitter IS NULL THEN
      RAISE EXCEPTION 'expense not found';
    END IF;
    IF v_submitter = auth.uid() THEN
      RAISE EXCEPTION 'auditors cannot review their own financial entries';
    END IF;
    UPDATE public.expenses SET auditor_status = p_status WHERE id = p_subject_id;
  END IF;
  INSERT INTO public.audit_reviews (community_id, subject_type, subject_id, reviewer_id, status, comments)
  VALUES (p_community, p_subject_type, p_subject_id, auth.uid(), p_status, NULLIF(p_comments, ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reconciliation and statements
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.statement_due_on(p_period_end date, p_due_day integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('month', p_period_end)::date + interval '1 month' + make_interval(days => p_due_day - 1))::date;
$$;

CREATE OR REPLACE FUNCTION public.start_reconciliation(
  p_community uuid,
  p_bank_account uuid,
  p_start date,
  p_end date,
  p_opening numeric,
  p_closing numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.bank_reconciliations (
    community_id, bank_account_id, period_start, period_end, opening_balance, closing_balance, created_by
  ) VALUES (
    p_community, p_bank_account, p_start, p_end, p_opening, p_closing, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_statement_lines(p_reconciliation uuid, p_lines jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community uuid;
  v_line jsonb;
  v_count integer := 0;
BEGIN
  SELECT community_id INTO v_community FROM public.bank_reconciliations WHERE id = p_reconciliation;
  IF v_community IS NULL THEN
    RAISE EXCEPTION 'reconciliation not found';
  END IF;
  IF NOT private.has_role(v_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.bank_statement_lines (reconciliation_id, line_date, description, direction, amount)
    VALUES (
      p_reconciliation,
      (v_line->>'date')::date,
      v_line->>'description',
      v_line->>'direction',
      (v_line->>'amount')::numeric(14,2)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_statement_line(p_line uuid, p_entry uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community uuid;
BEGIN
  SELECT r.community_id INTO v_community
  FROM public.bank_statement_lines l
  JOIN public.bank_reconciliations r ON r.id = l.reconciliation_id
  WHERE l.id = p_line;
  IF NOT private.has_role(v_community, ARRAY['treasurer', 'resident_auditor']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.bank_statement_lines SET matched_entry_id = p_entry WHERE id = p_line;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_reconciliation(p_reconciliation uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bank_reconciliations%ROWTYPE;
  v_book numeric(14,2);
  v_unmatched integer;
  v_difference numeric(14,2);
BEGIN
  SELECT * INTO v_row FROM public.bank_reconciliations WHERE id = p_reconciliation;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reconciliation not found';
  END IF;
  IF NOT private.has_role(v_row.community_id, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(SUM(CASE WHEN l.direction = 'debit' THEN l.amount ELSE -l.amount END), 0)
  INTO v_book
  FROM public.journal_lines l
  JOIN public.journal_entries e ON e.id = l.entry_id
  WHERE l.account_id = v_row.bank_account_id
    AND e.occurred_on BETWEEN v_row.period_start AND v_row.period_end;
  SELECT COUNT(*) INTO v_unmatched
  FROM public.bank_statement_lines
  WHERE reconciliation_id = p_reconciliation AND matched_entry_id IS NULL;
  v_difference := v_row.closing_balance - (v_row.opening_balance + v_book);
  UPDATE public.bank_reconciliations
  SET difference = v_difference,
      status = CASE WHEN v_difference = 0 AND v_unmatched = 0 THEN 'reconciled' ELSE 'open' END
  WHERE id = p_reconciliation;
  IF v_difference <> 0 OR v_unmatched <> 0 THEN
    RAISE EXCEPTION 'reconciliation difference remains unexplained';
  END IF;
  RETURN v_difference;
END;
$$;

CREATE OR REPLACE FUNCTION private.statement_snapshot(p_community uuid, p_start date, p_end date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'funds', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.account_balances(p_community) b), '[]'::jsonb),
    'banks', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.bank_balances(p_community) b), '[]'::jsonb),
    'expenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'number', e.expense_number, 'date', e.occurred_on,
        'payee', e.payee, 'description', e.description, 'amount', e.amount,
        'approval_status', e.approval_status, 'auditor_status', e.auditor_status
      ))
      FROM public.expenses e
      WHERE e.community_id = p_community AND e.occurred_on BETWEEN p_start AND p_end AND e.payment_status = 'paid'
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.close_month(p_community uuid, p_start date, p_end date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due_day integer;
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT statement_due_day INTO v_due_day FROM public.community_settings WHERE community_id = p_community;
  INSERT INTO public.financial_statements (community_id, period_start, period_end, due_on, status, created_by)
  VALUES (p_community, p_start, p_end, public.statement_due_on(p_end, v_due_day), 'draft', auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_statement(p_statement uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community uuid;
BEGIN
  SELECT community_id INTO v_community FROM public.financial_statements WHERE id = p_statement AND status = 'draft';
  IF v_community IS NULL THEN
    RAISE EXCEPTION 'statement is not a draft';
  END IF;
  IF NOT private.has_role(v_community, ARRAY['treasurer']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.financial_statements SET status = 'submitted_for_review' WHERE id = p_statement;
  PERFORM private.notify_members(v_community, 'statement_submitted', 'Financial statement submitted', 'A monthly statement is ready for auditor review.');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_statement(p_statement uuid, p_status text, p_comments text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.financial_statements%ROWTYPE;
  v_next text;
BEGIN
  SELECT * INTO v_row FROM public.financial_statements WHERE id = p_statement;
  IF NOT private.has_role(v_row.community_id, ARRAY['resident_auditor']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  v_next := CASE p_status
    WHEN 'verified' THEN 'reconciled_and_reviewed'
    WHEN 'clarification_required' THEN 'clarification_required'
    WHEN 'disputed' THEN 'clarification_required'
    ELSE NULL
  END;
  IF v_next IS NULL THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;
  UPDATE public.financial_statements SET status = v_next WHERE id = p_statement;
  INSERT INTO public.audit_reviews (community_id, subject_type, subject_id, reviewer_id, status, comments)
  VALUES (v_row.community_id, 'financial_statement', p_statement, auth.uid(), p_status, NULLIF(p_comments, ''));
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_statement(p_statement uuid, p_with_exceptions boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.financial_statements%ROWTYPE;
  v_version integer;
  v_open_expenses integer;
  v_open_recon integer;
BEGIN
  SELECT * INTO v_row FROM public.financial_statements WHERE id = p_statement;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'statement not found';
  END IF;
  IF NOT private.has_role(v_row.community_id, ARRAY['treasurer', 'committee_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_row.status <> 'reconciled_and_reviewed' AND NOT p_with_exceptions THEN
    RAISE EXCEPTION 'statement has not been reviewed';
  END IF;
  SELECT COUNT(*) INTO v_open_expenses
  FROM public.expenses
  WHERE community_id = v_row.community_id
    AND occurred_on BETWEEN v_row.period_start AND v_row.period_end
    AND payment_status = 'paid'
    AND auditor_status NOT IN ('verified', 'resolved');
  IF v_open_expenses > 0 AND NOT p_with_exceptions THEN
    RAISE EXCEPTION 'expenses in this period are not verified';
  END IF;
  SELECT COUNT(*) INTO v_open_recon
  FROM public.bank_reconciliations
  WHERE community_id = v_row.community_id
    AND period_end BETWEEN v_row.period_start AND v_row.period_end
    AND status <> 'reconciled';
  IF v_open_recon > 0 AND NOT p_with_exceptions THEN
    RAISE EXCEPTION 'bank reconciliation is not complete';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
  FROM public.financial_statement_versions WHERE statement_id = p_statement;
  INSERT INTO public.financial_statement_versions (statement_id, version_number, snapshot, published_by)
  VALUES (p_statement, v_version, private.statement_snapshot(v_row.community_id, v_row.period_start, v_row.period_end), auth.uid());
  UPDATE public.financial_statements
  SET status = CASE WHEN p_with_exceptions THEN 'published_with_exceptions' ELSE 'published' END
  WHERE id = p_statement;
  PERFORM private.notify_members(
    v_row.community_id,
    'statement_published',
    'Financial statement published',
    'The statement for ' || v_row.period_start::text || ' is available.'
  );
  RETURN v_version;
END;
$$;

-- ---------------------------------------------------------------------------
-- Concerns
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.next_ticket_number(p_community uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::integer;
  v_value integer;
BEGIN
  INSERT INTO public.ticket_counters (community_id, year, last_value)
  VALUES (p_community, v_year, 1)
  ON CONFLICT (community_id, year)
  DO UPDATE SET last_value = public.ticket_counters.last_value + 1
  RETURNING last_value INTO v_value;
  RETURN 'SOC-' || v_year::text || '-' || lpad(v_value::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ticket(
  p_community uuid,
  p_subject text,
  p_category text,
  p_description text,
  p_visibility text,
  p_unit_number text DEFAULT NULL,
  p_priority text DEFAULT 'medium'
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit uuid;
  v_number text;
  v_id uuid;
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_visibility NOT IN ('public', 'private') THEN
    RAISE EXCEPTION 'visibility must be public or private';
  END IF;
  IF p_category NOT IN (
    'Maintenance', 'Water', 'Electricity', 'Security', 'Housekeeping',
    'Lift and facilities', 'Finance', 'Governance', 'General', 'Other'
  ) THEN
    RAISE EXCEPTION 'unknown ticket category';
  END IF;
  IF p_unit_number IS NOT NULL THEN
    SELECT id INTO v_unit FROM public.units WHERE community_id = p_community AND number = p_unit_number;
  END IF;
  v_number := private.next_ticket_number(p_community);
  INSERT INTO public.tickets (
    community_id, ticket_number, subject, category, description, visibility, unit_id, priority, created_by
  ) VALUES (
    p_community, v_number, btrim(p_subject), p_category, btrim(p_description), p_visibility, v_unit, COALESCE(p_priority, 'medium'), auth.uid()
  ) RETURNING id INTO v_id;
  INSERT INTO public.ticket_status_history (ticket_id, from_status, to_status, changed_by, note)
  VALUES (v_id, NULL, 'open', auth.uid(), 'opened');
  PERFORM private.notify_members(p_community, 'ticket_opened', 'New concern ' || v_number, btrim(p_subject));
  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_ticket(p_ticket uuid, p_status text, p_note text, p_assignee uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_allowed boolean := false;
BEGIN
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket;
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'ticket not found';
  END IF;
  IF p_status NOT IN ('open', 'assigned', 'in_progress', 'awaiting_resident', 'resolved', 'closed', 'reopened', 'on_hold', 'rejected') THEN
    RAISE EXCEPTION 'unknown ticket status';
  END IF;

  IF private.has_role(v_ticket.community_id, ARRAY['committee_admin', 'platform_admin']) THEN
    v_allowed := true;
  ELSIF v_ticket.assigned_to = auth.uid() AND p_status IN ('in_progress', 'awaiting_resident', 'resolved', 'on_hold') THEN
    v_allowed := true;
  ELSIF v_ticket.created_by = auth.uid() AND v_ticket.status = 'resolved' AND p_status IN ('closed', 'reopened') THEN
    v_allowed := true;
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_status = 'rejected' AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'a rejection needs an explanation';
  END IF;

  UPDATE public.tickets
  SET status = p_status,
      assigned_to = COALESCE(p_assignee, assigned_to)
  WHERE id = p_ticket;
  INSERT INTO public.ticket_status_history (ticket_id, from_status, to_status, changed_by, note)
  VALUES (p_ticket, v_ticket.status, p_status, auth.uid(), NULLIF(p_note, ''));
  IF p_note IS NOT NULL AND btrim(p_note) <> '' THEN
    INSERT INTO public.ticket_updates (ticket_id, author_id, body) VALUES (p_ticket, auth.uid(), btrim(p_note));
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Governance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_meeting(
  p_community uuid,
  p_type text,
  p_title text,
  p_held_on timestamptz,
  p_venue text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_type NOT IN ('committee', 'general_body', 'emergency', 'special') THEN
    RAISE EXCEPTION 'unknown meeting type';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.meetings (community_id, meeting_type, title, held_on, venue, created_by, published_at)
  VALUES (p_community, p_type, btrim(p_title), p_held_on, p_venue, auth.uid(), now())
  RETURNING id INTO v_id;
  PERFORM private.notify_members(p_community, 'meeting_scheduled', 'Meeting scheduled', btrim(p_title));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_minutes(p_meeting uuid, p_minutes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community uuid;
BEGIN
  SELECT community_id INTO v_community FROM public.meetings WHERE id = p_meeting;
  IF NOT private.has_role(v_community, ARRAY['committee_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.meetings SET minutes = p_minutes, published_at = now() WHERE id = p_meeting;
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_resolution(
  p_community uuid,
  p_meeting uuid,
  p_title text,
  p_description text,
  p_voting_starts timestamptz,
  p_voting_ends timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'resident']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.resolutions (
    community_id, meeting_id, title, description, proposed_by, status, voting_starts_at, voting_ends_at
  ) VALUES (
    p_community, p_meeting, btrim(p_title), btrim(p_description), auth.uid(), 'under_discussion', p_voting_starts, p_voting_ends
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_vote(p_resolution uuid, p_vote text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolution public.resolutions%ROWTYPE;
  v_unit uuid;
BEGIN
  IF p_vote NOT IN ('yes', 'no', 'abstain') THEN
    RAISE EXCEPTION 'vote must be yes, no, or abstain';
  END IF;
  SELECT * INTO v_resolution FROM public.resolutions WHERE id = p_resolution;
  IF v_resolution.status <> 'under_discussion' THEN
    RAISE EXCEPTION 'voting is not open';
  END IF;
  IF now() < v_resolution.voting_starts_at OR now() > v_resolution.voting_ends_at THEN
    RAISE EXCEPTION 'voting is not open';
  END IF;
  SELECT o.unit_id INTO v_unit
  FROM public.unit_occupancies o
  WHERE o.community_id = v_resolution.community_id
    AND o.profile_id = auth.uid()
    AND o.ended_on IS NULL
  ORDER BY o.started_on
  LIMIT 1;
  IF v_unit IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.resolution_votes (resolution_id, unit_id, voter_id, vote)
  VALUES (p_resolution, v_unit, auth.uid(), p_vote);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_vote(p_resolution uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolution public.resolutions%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_units integer;
  v_ballots integer;
  v_yes integer;
  v_no integer;
  v_status text;
BEGIN
  SELECT * INTO v_resolution FROM public.resolutions WHERE id = p_resolution;
  IF NOT private.has_role(v_resolution.community_id, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO v_settings FROM public.community_settings WHERE community_id = v_resolution.community_id;
  SELECT COUNT(*) INTO v_units FROM public.units WHERE community_id = v_resolution.community_id;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE vote = 'yes'), COUNT(*) FILTER (WHERE vote = 'no')
  INTO v_ballots, v_yes, v_no
  FROM public.resolution_votes WHERE resolution_id = p_resolution;
  IF v_units = 0 OR (v_ballots::numeric / v_units * 100) < v_settings.election_quorum_percent THEN
    v_status := 'deferred';
  ELSIF v_yes > v_no THEN
    v_status := 'approved';
  ELSE
    v_status := 'rejected';
  END IF;
  UPDATE public.resolutions
  SET status = v_status,
      result_note = format('%s yes, %s no, %s ballots of %s units', v_yes, v_no, v_ballots, v_units)
  WHERE id = p_resolution;
  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_auditor_election(
  p_community uuid,
  p_term_starts date,
  p_term_ends date,
  p_voting_starts date,
  p_voting_ends date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seats integer;
  v_id uuid;
BEGIN
  IF NOT private.has_role(p_community, ARRAY['committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT auditor_seats INTO v_seats FROM public.community_settings WHERE community_id = p_community;
  INSERT INTO public.auditor_elections (
    community_id, seats, term_starts_on, term_ends_on, voting_starts_on, voting_ends_on, created_by
  ) VALUES (
    p_community, v_seats, p_term_starts, p_term_ends, p_voting_starts, p_voting_ends, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_auditor_ballot(p_election uuid, p_candidate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.auditor_elections%ROWTYPE;
  v_unit uuid;
BEGIN
  SELECT * INTO v_election FROM public.auditor_elections WHERE id = p_election AND status = 'open';
  IF v_election.id IS NULL THEN
    RAISE EXCEPTION 'election is not open';
  END IF;
  IF CURRENT_DATE < v_election.voting_starts_on OR CURRENT_DATE > v_election.voting_ends_on THEN
    RAISE EXCEPTION 'voting is not open';
  END IF;
  SELECT o.unit_id INTO v_unit
  FROM public.unit_occupancies o
  WHERE o.community_id = v_election.community_id AND o.profile_id = auth.uid() AND o.ended_on IS NULL
  LIMIT 1;
  IF v_unit IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.auditor_ballots (election_id, unit_id, candidate_id, cast_by)
  VALUES (p_election, v_unit, p_candidate, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.certify_auditor_election(p_election uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.auditor_elections%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_units integer;
  v_ballots integer;
  v_winner uuid;
  v_top integer;
  v_second integer;
  v_term uuid;
BEGIN
  SELECT * INTO v_election FROM public.auditor_elections WHERE id = p_election AND status = 'open';
  IF v_election.id IS NULL THEN
    RAISE EXCEPTION 'election is not open';
  END IF;
  IF NOT private.is_member(v_election.community_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO v_settings FROM public.community_settings WHERE community_id = v_election.community_id;
  SELECT COUNT(*) INTO v_units
  FROM public.unit_occupancies
  WHERE community_id = v_election.community_id AND ended_on IS NULL;
  SELECT COUNT(*) INTO v_ballots FROM public.auditor_ballots WHERE election_id = p_election;
  IF v_units = 0 OR (v_ballots::numeric / v_units * 100) < v_settings.election_quorum_percent THEN
    UPDATE public.auditor_elections SET status = 'failed' WHERE id = p_election;
    RAISE EXCEPTION 'election quorum was not met';
  END IF;
  SELECT candidate_id, votes INTO v_winner, v_top
  FROM (
    SELECT candidate_id, COUNT(*) AS votes
    FROM public.auditor_ballots WHERE election_id = p_election
    GROUP BY candidate_id
    ORDER BY COUNT(*) DESC, candidate_id
  ) ranked
  LIMIT 1;
  SELECT COUNT(*) INTO v_second FROM public.auditor_ballots
  WHERE election_id = p_election AND candidate_id <> v_winner;
  IF v_second >= v_top THEN
    UPDATE public.auditor_elections SET status = 'failed' WHERE id = p_election;
    RAISE EXCEPTION 'election did not produce a clear winner';
  END IF;
  INSERT INTO public.auditor_terms (community_id, profile_id, election_id, starts_on, ends_on)
  VALUES (v_election.community_id, v_winner, p_election, v_election.term_starts_on, v_election.term_ends_on)
  RETURNING id INTO v_term;
  INSERT INTO public.community_memberships (community_id, profile_id, role, created_by)
  VALUES (v_election.community_id, v_winner, 'resident_auditor', auth.uid())
  ON CONFLICT (community_id, profile_id, role) DO UPDATE SET status = 'active';
  UPDATE public.auditor_elections SET status = 'certified' WHERE id = p_election;
  RETURN v_term;
END;
$$;

-- ---------------------------------------------------------------------------
-- Documents and dashboards
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_document(
  p_community uuid,
  p_name text,
  p_category text,
  p_description text,
  p_access_class text,
  p_redacted boolean,
  p_storage_path text,
  p_related_type text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_access_class NOT IN ('public', 'committee', 'private_unit') THEN
    RAISE EXCEPTION 'unknown access class';
  END IF;
  IF NOT private.has_role(p_community, ARRAY['treasurer', 'committee_admin', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_category = 'invoice' AND p_access_class = 'public' AND NOT p_redacted THEN
    RAISE EXCEPTION 'a public invoice must be a redacted file';
  END IF;
  INSERT INTO public.documents (
    community_id, name, category, description, access_class, redacted, storage_path,
    related_type, related_id, unit_id, uploaded_by
  ) VALUES (
    p_community, btrim(p_name), p_category, p_description, p_access_class, COALESCE(p_redacted, false), p_storage_path,
    p_related_type, p_related_id, p_unit_id, auth.uid()
  ) RETURNING id INTO v_id;
  INSERT INTO public.document_versions (document_id, version_number, storage_path, redacted, uploaded_by)
  VALUES (v_id, 1, p_storage_path, COALESCE(p_redacted, false), auth.uid());
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resident_dashboard(p_community uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT private.is_member(p_community) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT jsonb_build_object(
    'funds', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.account_balances(p_community) b), '[]'::jsonb),
    'banks', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.bank_balances(p_community) b), '[]'::jsonb),
    'open_public_concerns', (SELECT COUNT(*) FROM public.tickets t WHERE t.community_id = p_community AND t.visibility = 'public' AND t.status NOT IN ('closed', 'rejected')),
    'recently_resolved', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('number', t.ticket_number, 'subject', t.subject))
      FROM (
        SELECT ticket_number, subject FROM public.tickets
        WHERE community_id = p_community AND visibility = 'public' AND status IN ('resolved', 'closed')
        ORDER BY updated_at DESC LIMIT 5
      ) t
    ), '[]'::jsonb),
    'upcoming_meetings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', m.title, 'held_on', m.held_on, 'venue', m.venue))
      FROM (
        SELECT title, held_on, venue FROM public.meetings
        WHERE community_id = p_community AND held_on >= now()
        ORDER BY held_on LIMIT 5
      ) m
    ), '[]'::jsonb),
    'latest_statement', (
      SELECT jsonb_build_object('id', s.id, 'status', s.status, 'period_start', s.period_start, 'period_end', s.period_end, 'due_on', s.due_on)
      FROM public.financial_statements s
      WHERE s.community_id = p_community
        AND (s.status IN ('published', 'published_with_exceptions', 'overdue') OR s.due_on < CURRENT_DATE)
      ORDER BY s.period_end DESC
      LIMIT 1
    ),
    'announcements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', n.title, 'body', n.body, 'created_at', n.created_at))
      FROM (
        SELECT title, body, created_at FROM public.notifications
        WHERE community_id = p_community AND recipient_id = auth.uid()
        ORDER BY created_at DESC LIMIT 5
      ) n
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY communities_read ON public.communities FOR SELECT TO authenticated
USING (private.is_member(id));
CREATE POLICY settings_read ON public.community_settings FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships mine
    JOIN public.community_memberships theirs ON theirs.community_id = mine.community_id
    WHERE mine.profile_id = auth.uid() AND theirs.profile_id = profiles.id AND mine.status = 'active'
      AND private.has_role(mine.community_id, ARRAY['committee_admin', 'treasurer', 'resident_auditor', 'platform_admin'])
  )
);
CREATE POLICY units_read ON public.units FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY occupancy_read ON public.unit_occupancies FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR private.has_role(community_id, ARRAY['committee_admin', 'treasurer', 'resident_auditor', 'platform_admin'])
);
CREATE POLICY memberships_read ON public.community_memberships FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY bank_accounts_read ON public.bank_accounts FOR SELECT TO authenticated
USING (private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin']));
CREATE POLICY accounts_read ON public.accounts FOR SELECT TO authenticated
USING (
  private.is_member(community_id)
  AND (account_type = 'fund' OR private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin']))
);
CREATE POLICY journal_entries_read ON public.journal_entries FOR SELECT TO authenticated
USING (private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin']));
CREATE POLICY journal_lines_read ON public.journal_lines FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries e
    JOIN public.accounts a ON a.id = journal_lines.account_id
    WHERE e.id = journal_lines.entry_id
      AND private.has_role(e.community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
  )
);
CREATE POLICY categories_read ON public.expense_categories FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY expenses_read ON public.expenses FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY approvals_read ON public.expense_approvals FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_approvals.expense_id AND private.is_member(e.community_id)
  )
);
CREATE POLICY periods_read ON public.collection_periods FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY demands_read ON public.maintenance_demands FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
  OR private.occupies(unit_id)
);
CREATE POLICY collections_read ON public.collections FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
  OR EXISTS (
    SELECT 1 FROM public.maintenance_demands d
    WHERE d.id = collections.demand_id AND private.occupies(d.unit_id)
  )
);
CREATE POLICY recon_read ON public.bank_reconciliations FOR SELECT TO authenticated
USING (private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin']));
CREATE POLICY statement_lines_read ON public.bank_statement_lines FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_reconciliations r
    WHERE r.id = bank_statement_lines.reconciliation_id
      AND private.has_role(r.community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
  )
);
CREATE POLICY statements_read ON public.financial_statements FOR SELECT TO authenticated
USING (
  private.has_role(community_id, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
  OR (
    private.is_member(community_id)
    AND (status IN ('published', 'published_with_exceptions', 'overdue') OR due_on < CURRENT_DATE)
  )
);
CREATE POLICY statement_versions_read ON public.financial_statement_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.financial_statements s
    WHERE s.id = financial_statement_versions.statement_id
      AND private.is_member(s.community_id)
      AND s.status IN ('published', 'published_with_exceptions')
  )
);
CREATE POLICY reviews_read ON public.audit_reviews FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY elections_read ON public.auditor_elections FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY ballots_read ON public.auditor_ballots FOR SELECT TO authenticated
USING (
  cast_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.auditor_elections e
    WHERE e.id = auditor_ballots.election_id
      AND e.status <> 'open'
      AND private.is_member(e.community_id)
  )
);
CREATE POLICY terms_read ON public.auditor_terms FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY tickets_read ON public.tickets FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (
    visibility = 'public' AND private.is_member(community_id)
  )
  OR private.has_role(community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer'])
);
CREATE POLICY ticket_updates_read ON public.ticket_updates FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_updates.ticket_id AND (
    t.created_by = auth.uid() OR t.assigned_to = auth.uid()
    OR (t.visibility = 'public' AND private.is_member(t.community_id))
    OR private.has_role(t.community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer'])
  ))
);
CREATE POLICY ticket_history_read ON public.ticket_status_history FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_status_history.ticket_id AND (
    t.created_by = auth.uid() OR t.visibility = 'public' OR private.has_role(t.community_id, ARRAY['committee_admin', 'platform_admin', 'treasurer'])
  ))
);
CREATE POLICY meetings_read ON public.meetings FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY resolutions_read ON public.resolutions FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY votes_read ON public.resolution_votes FOR SELECT TO authenticated
USING (
  voter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.resolutions r
    WHERE r.id = resolution_votes.resolution_id AND private.is_member(r.community_id) AND r.status <> 'under_discussion'
  )
);
CREATE POLICY campaigns_read ON public.contribution_campaigns FOR SELECT TO authenticated
USING (private.is_member(community_id));
CREATE POLICY documents_read ON public.documents FOR SELECT TO authenticated
USING (
  private.is_member(community_id) AND (
    (access_class = 'public' AND (category <> 'invoice' OR redacted))
    OR (access_class = 'committee' AND private.has_role(community_id, ARRAY['committee_admin', 'treasurer', 'resident_auditor', 'platform_admin']))
    OR (access_class = 'private_unit' AND (private.occupies(unit_id) OR private.has_role(community_id, ARRAY['committee_admin', 'treasurer', 'resident_auditor', 'platform_admin'])))
  )
);
CREATE POLICY document_versions_read ON public.document_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND private.is_member(d.community_id)
      AND (
        (d.access_class = 'public' AND document_versions.redacted)
        OR private.has_role(d.community_id, ARRAY['committee_admin', 'treasurer', 'resident_auditor', 'platform_admin'])
        OR (d.access_class = 'private_unit' AND private.occupies(d.unit_id) AND document_versions.redacted)
      )
  )
);
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated
USING (recipient_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());
CREATE POLICY audit_logs_read ON public.audit_logs FOR SELECT TO authenticated
USING (community_id IS NOT NULL AND private.has_role(community_id, ARRAY['committee_admin', 'resident_auditor', 'platform_admin', 'treasurer']));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated, anon;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM anon, PUBLIC;

-- Storage policies apply only when this migration runs inside Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('community-originals', 'community-originals', false),
           ('community-published', 'community-published', false)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS originals_read ON storage.objects;
    DROP POLICY IF EXISTS originals_write ON storage.objects;
    DROP POLICY IF EXISTS published_read ON storage.objects;
    DROP POLICY IF EXISTS published_write ON storage.objects;

    CREATE POLICY originals_read ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'community-originals'
      AND private.has_role(((storage.foldername(name))[1])::uuid, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
    );
    CREATE POLICY originals_write ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'community-originals'
      AND private.has_role(((storage.foldername(name))[1])::uuid, ARRAY['treasurer', 'committee_admin', 'platform_admin'])
    );
    CREATE POLICY published_read ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'community-published'
      AND private.is_member(((storage.foldername(name))[1])::uuid)
      AND (
        private.has_role(((storage.foldername(name))[1])::uuid, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
        OR EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.community_id = ((storage.foldername(name))[1])::uuid
            AND d.storage_path = name
            AND d.access_class = 'public'
            AND (d.category <> 'invoice' OR d.redacted)
        )
      )
    );
    CREATE POLICY published_write ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'community-published'
      AND private.has_role(((storage.foldername(name))[1])::uuid, ARRAY['treasurer', 'committee_admin', 'platform_admin'])
    );
  END IF;
END $$;
