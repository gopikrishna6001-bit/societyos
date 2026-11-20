-- Period collection register and income/expense facts for operational dashboard drill-downs.
-- Unit-level dues only for treasurer / committee / auditor / platform admin.

CREATE OR REPLACE FUNCTION public.period_collection_register(p_community uuid, p_period uuid)
RETURNS TABLE (
  demand_id uuid,
  unit_number text,
  expected_amount numeric,
  additional_amount numeric,
  billed_amount numeric,
  collected_amount numeric,
  outstanding_amount numeric,
  due_on date,
  days_overdue integer,
  last_paid_on date,
  last_payment_mode text,
  last_bank_reference text,
  last_receipt_number text,
  payment_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(p_community, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.collection_periods
    WHERE id = p_period AND community_id = p_community
  ) THEN
    RAISE EXCEPTION 'period not found';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    u.number,
    d.expected_amount,
    d.additional_amount,
    (d.expected_amount + d.additional_amount)::numeric(14,2),
    COALESCE(SUM(c.amount), 0)::numeric(14,2),
    (d.expected_amount + d.additional_amount - COALESCE(SUM(c.amount), 0))::numeric(14,2),
    p.due_on,
    GREATEST(CURRENT_DATE - p.due_on, 0)::integer,
    MAX(c.paid_on),
    (ARRAY_AGG(c.payment_mode ORDER BY c.paid_on DESC NULLS LAST))[1],
    (ARRAY_AGG(c.bank_reference ORDER BY c.paid_on DESC NULLS LAST))[1],
    (ARRAY_AGG(c.receipt_number ORDER BY c.paid_on DESC NULLS LAST))[1],
    CASE
      WHEN COALESCE(SUM(c.amount), 0) <= 0 THEN 'outstanding'
      WHEN COALESCE(SUM(c.amount), 0) < (d.expected_amount + d.additional_amount) THEN 'partial'
      ELSE 'paid'
    END
  FROM public.maintenance_demands d
  JOIN public.units u ON u.id = d.unit_id
  JOIN public.collection_periods p ON p.id = d.period_id
  LEFT JOIN public.collections c ON c.demand_id = d.id
  WHERE d.community_id = p_community AND d.period_id = p_period
  GROUP BY d.id, u.number, d.expected_amount, d.additional_amount, p.due_on
  ORDER BY u.number;
END;
$$;

CREATE OR REPLACE FUNCTION public.period_expense_register(p_community uuid, p_start date, p_end date)
RETURNS TABLE (
  expense_id uuid,
  expense_number text,
  occurred_on date,
  category text,
  payee text,
  description text,
  amount numeric,
  approval_status text,
  payment_status text,
  auditor_status text,
  journal_entry_id uuid
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
  -- Residents see published/approved expenses; finance roles see all in range.
  RETURN QUERY
  SELECT
    e.id,
    e.expense_number,
    e.occurred_on,
    COALESCE(cat.name, 'Other'),
    e.payee,
    e.description,
    e.amount,
    e.approval_status,
    e.payment_status,
    e.auditor_status,
    e.journal_entry_id
  FROM public.expenses e
  LEFT JOIN public.expense_categories cat ON cat.id = e.category_id
  WHERE e.community_id = p_community
    AND e.occurred_on BETWEEN p_start AND p_end
    AND (
      private.has_role(p_community, ARRAY['treasurer', 'committee_admin', 'resident_auditor', 'platform_admin'])
      OR e.approval_status IN ('approved', 'paid')
      OR e.payment_status = 'paid'
    )
  ORDER BY e.occurred_on DESC, e.expense_number DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.recent_ledger_entries(p_community uuid, p_limit integer DEFAULT 20)
RETURNS TABLE (
  entry_id uuid,
  occurred_on date,
  entry_type text,
  narration text,
  amount numeric,
  reverses_entry_id uuid
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
    e.id,
    e.occurred_on,
    e.entry_type,
    e.narration,
    COALESCE((
      SELECT SUM(l.amount) FROM public.journal_lines l
      WHERE l.entry_id = e.id AND l.direction = 'debit'
    ), 0)::numeric(14,2),
    e.reverses_entry_id
  FROM public.journal_entries e
  WHERE e.community_id = p_community
  ORDER BY e.occurred_on DESC, e.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 20), 100), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.period_collection_register(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.period_expense_register(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recent_ledger_entries(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.period_collection_register(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.period_expense_register(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recent_ledger_entries(uuid, integer) TO authenticated;
