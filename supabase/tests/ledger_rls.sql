-- Assertions for the ledger, approvals, privacy, and elections.

CREATE TABLE public._test_ctx (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT ALL ON public._test_ctx TO PUBLIC;

CREATE FUNCTION public._put(p_key text, p_value text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public._test_ctx (key, value) VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
$$;

CREATE FUNCTION public._get(p_key text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT value FROM public._test_ctx WHERE key = p_key;
$$;

CREATE FUNCTION public._assert(p_ok boolean, p_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(p_ok, false) THEN
    RAISE EXCEPTION 'assertion failed: %', p_message;
  END IF;
END;
$$;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-1111-1111-111111111111', 'asha@example.com', '{"full_name":"Asha Rao"}'),
  ('22222222-2222-2222-2222-222222222222', 'ravi@example.com', '{"full_name":"Ravi Iyer"}'),
  ('33333333-3333-3333-3333-333333333333', 'meera@example.com', '{"full_name":"Meera Shah"}'),
  ('44444444-4444-4444-4444-444444444444', 'leela@example.com', '{"full_name":"Leela Nair"}'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@example.com', '{"full_name":"Outsider"}');

SELECT public._assert(
  public.statement_due_on('2026-03-31', 10) = '2026-04-10',
  'publication deadline is the 10th of the following month'
);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid;
  v_bank uuid;
  v_maintenance uuid;
  v_corpus uuid;
  v_opening uuid;
  v_again uuid;
  v_unit_a uuid;
  v_unit_b uuid;
  v_period uuid;
  v_demand uuid;
  v_opening_amount numeric;
  v_receipts numeric;
  v_transfers_out numeric;
  v_closing numeric;
  v_summary record;
  v_expense uuid;
  v_message text;
BEGIN
  v_community := public.create_community('Sunrise Residency', 'Road 1', 'Hyderabad', 5000, 25000, 10);
  PERFORM public.grant_role(v_community, 'ravi@example.com', 'resident');
  PERFORM public.grant_role(v_community, 'meera@example.com', 'resident');
  PERFORM public.grant_role(v_community, 'leela@example.com', 'treasurer');

  v_unit_a := public.add_unit(v_community, 'A', '101');
  v_unit_b := public.add_unit(v_community, 'A', '102');
  PERFORM public.add_occupancy(v_community, '101', 'meera@example.com', 'owner');
  PERFORM public.add_occupancy(v_community, '102', 'ravi@example.com', 'owner');

  v_bank := public.add_bank_account(v_community, 'Society current', 'XXXX1234');
  v_maintenance := public.open_fund(v_community, 'maintenance', 'Maintenance Fund', 'maintenance', 'Monthly upkeep');
  v_corpus := public.open_fund(v_community, 'corpus', 'Corpus Fund', 'corpus', 'Long-term corpus');

  v_opening := public.post_journal(
    v_community, 'opening', '2026-04-01', 'Opening balances', 'opening-1',
    jsonb_build_array(
      jsonb_build_object('account_id', v_bank, 'direction', 'debit', 'amount', '1000.00'),
      jsonb_build_object('account_id', v_maintenance, 'direction', 'credit', 'amount', '1000.00')
    )
  );
  v_again := public.post_journal(
    v_community, 'opening', '2026-04-01', 'Opening balances', 'opening-1',
    jsonb_build_array(
      jsonb_build_object('account_id', v_bank, 'direction', 'debit', 'amount', '1000.00'),
      jsonb_build_object('account_id', v_maintenance, 'direction', 'credit', 'amount', '1000.00')
    )
  );
  PERFORM public._assert(v_opening = v_again, 'retry returns the original journal entry');
  PERFORM public._assert(
    (SELECT COUNT(*) FROM public.journal_entries WHERE community_id = v_community) = 1,
    'retry does not create a second journal entry'
  );

  BEGIN
    PERFORM public.post_journal(
      v_community, 'opening', '2026-04-01', 'Different', 'opening-1',
      jsonb_build_array(
        jsonb_build_object('account_id', v_bank, 'direction', 'debit', 'amount', '5.00'),
        jsonb_build_object('account_id', v_maintenance, 'direction', 'credit', 'amount', '5.00')
      )
    );
    RAISE EXCEPTION 'expected idempotency mismatch';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%different payload%', v_message);
  END;

  BEGIN
    PERFORM public.post_journal(
      v_community, 'receipt', '2026-04-02', 'Unbalanced', 'bad-1',
      jsonb_build_array(
        jsonb_build_object('account_id', v_bank, 'direction', 'debit', 'amount', '10.00'),
        jsonb_build_object('account_id', v_maintenance, 'direction', 'credit', 'amount', '9.00')
      )
    );
    RAISE EXCEPTION 'expected unbalanced rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%not balanced%', v_message);
  END;

  PERFORM public.post_journal(
    v_community, 'transfer', '2026-04-03', 'Move to corpus', 'xfer-1',
    jsonb_build_array(
      jsonb_build_object('account_id', v_maintenance, 'direction', 'debit', 'amount', '200.00'),
      jsonb_build_object('account_id', v_corpus, 'direction', 'credit', 'amount', '200.00')
    )
  );

  SELECT b.opening, b.receipts, b.transfers_out, b.closing
  INTO v_opening_amount, v_receipts, v_transfers_out, v_closing
  FROM public.account_balances(v_community) b
  WHERE b.account_id = v_maintenance;
  PERFORM public._assert(v_opening_amount = 1000, 'opening balance comes from the opening entry');
  PERFORM public._assert(v_transfers_out = 200, 'transfer out is not treated as expenditure');
  PERFORM public._assert(v_closing = v_opening_amount + v_receipts - v_transfers_out, 'fund formula holds');
  PERFORM public._assert(
    (SELECT SUM(closing) FROM public.account_balances(v_community)) = 1000,
    'inter-fund transfer does not change consolidated funds'
  );

  BEGIN
    PERFORM public.post_journal(
      v_community, 'transfer', '2026-04-03', 'Disguised receipt', 'bad-xfer',
      jsonb_build_array(
        jsonb_build_object('account_id', v_bank, 'direction', 'debit', 'amount', '10.00'),
        jsonb_build_object('account_id', v_maintenance, 'direction', 'credit', 'amount', '10.00')
      )
    );
    RAISE EXCEPTION 'expected transfer rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%between funds%', v_message);
  END;

  BEGIN
    PERFORM public.post_journal(
      v_community, 'reversal', '2026-04-04', 'Unlinked reversal', 'bad-reversal',
      jsonb_build_array(
        jsonb_build_object('account_id', v_bank, 'direction', 'credit', 'amount', '10.00'),
        jsonb_build_object('account_id', v_maintenance, 'direction', 'debit', 'amount', '10.00')
      )
    );
    RAISE EXCEPTION 'expected unlinked reversal rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%must reference the original%', v_message);
  END;

  PERFORM public.post_journal(
    v_community, 'receipt', '2026-04-04', 'Small receipt', 'rcpt-small',
    jsonb_build_array(
      jsonb_build_object('account_id', v_bank, 'direction', 'debit', 'amount', '10.00'),
      jsonb_build_object('account_id', v_maintenance, 'direction', 'credit', 'amount', '10.00')
    )
  );
  PERFORM public.reverse_entry(
    (SELECT id FROM public.journal_entries WHERE community_id = v_community AND idempotency_key = 'rcpt-small'),
    '2026-04-04', 'Reverse small receipt', 'rcpt-small-reverse'
  );
  PERFORM public._assert(
    (SELECT reverses_entry_id IS NOT NULL FROM public.journal_entries WHERE community_id = v_community AND idempotency_key = 'rcpt-small-reverse'),
    'a reversal keeps the original entry'
  );
  PERFORM public._assert(
    (SELECT closing FROM public.account_balances(v_community) WHERE account_id = v_maintenance) = 800,
    'reversing the receipt restores the earlier fund balance'
  );
  BEGIN
    PERFORM public.reverse_entry(
      (SELECT id FROM public.journal_entries WHERE community_id = v_community AND idempotency_key = 'rcpt-small'),
      '2026-04-04', 'Reverse small receipt again', 'rcpt-small-reverse-2'
    );
    RAISE EXCEPTION 'expected a second reversal to fail';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%already been reversed%', v_message);
  END;

  v_period := public.open_collection_period(v_community, '2026-27', '2026-04-01', '2026-04-10', 100);
  SELECT id INTO v_demand FROM public.maintenance_demands WHERE period_id = v_period AND unit_id = v_unit_a;
  PERFORM public.record_collection(
    v_demand, 100, '2026-04-05', 'upi', 'UTR1', 'RCPT-101', 'rcpt-101', v_bank, v_maintenance
  );
  SELECT * INTO v_summary FROM public.collection_summary(v_community, v_period);
  PERFORM public._assert(v_summary.expected = 200, 'summary includes every unit');
  PERFORM public._assert(v_summary.collected = 100, 'summary counts the recorded receipt');
  PERFORM public._assert(v_summary.paid_units = 1 AND v_summary.unpaid_units = 1, 'paid and unpaid units are counted');

  v_expense := public.create_expense(
    v_community, '2026-04-06', v_maintenance, 'Housekeeping', 'April housekeeping', 'Clean Co', 4000, false, NULL
  );
  PERFORM public.decide_expense(v_expense, 'approved', 'within treasurer limit');
  BEGIN
    PERFORM public.decide_expense(v_expense, 'approved', 'again');
    RAISE EXCEPTION 'expected duplicate approval rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%already recorded%', v_message);
  END;
  PERFORM public._assert(
    (SELECT approval_status FROM public.expenses WHERE id = v_expense) = 'approved',
    'treasurer can approve within the configured limit'
  );

  PERFORM public._put('community', v_community::text);
  PERFORM public._put('bank', v_bank::text);
  PERFORM public._put('maintenance', v_maintenance::text);
  PERFORM public._put('unit_a', v_unit_a::text);
  PERFORM public._put('period', v_period::text);
END $$;

RESET ROLE;
UPDATE public.community_settings SET committee_quorum = 2 WHERE community_id = public._get('community')::uuid;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;
DO $$
DECLARE
  v_expense uuid;
  v_message text;
BEGIN
  v_expense := public.create_expense(
    public._get('community')::uuid, '2026-04-07', public._get('maintenance')::uuid,
    'Civil repairs', 'Common area repair', 'Fix Co', 6000, false, NULL
  );
  PERFORM public.decide_expense(v_expense, 'approved', 'first of two');
  PERFORM public._assert(
    (SELECT approval_status FROM public.expenses WHERE id = v_expense) = 'pending',
    'one committee member does not meet a quorum of two'
  );
  BEGIN
    PERFORM public.decide_expense(v_expense, 'approved', 'same person again');
    RAISE EXCEPTION 'expected duplicate approval rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%already recorded%', v_message);
  END;
  PERFORM public._assert(
    (SELECT COUNT(*) FROM public.expense_approvals WHERE expense_id = v_expense) = 1,
    'the same approver is not counted twice toward quorum'
  );
END $$;
RESET ROLE;
UPDATE public.community_settings SET committee_quorum = 1 WHERE community_id = public._get('community')::uuid;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
SELECT public._assert(
  (SELECT COUNT(*) FROM public.maintenance_demands) = 1,
  'a resident sees only their own maintenance demand'
);
RESET ROLE;

UPDATE public.community_memberships
SET status = 'inactive'
WHERE profile_id = '11111111-1111-1111-1111-111111111111' AND role = 'treasurer';

SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid := public._get('community')::uuid;
  v_maintenance uuid := public._get('maintenance')::uuid;
  v_bank uuid := public._get('bank')::uuid;
  v_large uuid;
  v_paid uuid;
  v_message text;
BEGIN
  v_large := public.create_expense(
    v_community, '2026-04-08', v_maintenance, 'Lift maintenance', 'Lift repair', 'Lift Co', 18000, false, NULL
  );
  BEGIN
    PERFORM public.decide_expense(v_large, 'approved', 'should fail');
    RAISE EXCEPTION 'expected limit rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%beyond the configured limit%', v_message);
  END;
  PERFORM public._assert(
    (SELECT approval_status FROM public.expenses WHERE id = v_large) = 'pending',
    'an over-limit attempt leaves the expense pending'
  );

  v_paid := public.create_expense(
    v_community, '2026-04-09', v_maintenance, 'Security', 'Guard wages', 'Guard Co', 3000, false, NULL
  );
  PERFORM public.decide_expense(v_paid, 'approved', 'within limit');
  PERFORM public.pay_expense(v_paid, v_bank, 'neft', 'NEFT1', 'pay-guard');
  PERFORM public._assert((SELECT payment_status FROM public.expenses WHERE id = v_paid) = 'paid', 'approved expense can be paid');
  PERFORM public._put('paid_expense', v_paid::text);
END $$;

RESET ROLE;

DO $$
DECLARE
  v_message text;
BEGIN
  BEGIN
    UPDATE public.journal_lines SET amount = 1;
    RAISE EXCEPTION 'expected immutable ledger';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%immutable%', v_message);
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid := public._get('community')::uuid;
  v_election uuid;
  v_message text;
BEGIN
  BEGIN
    PERFORM public.grant_role(v_community, 'ravi@example.com', 'resident_auditor');
    RAISE EXCEPTION 'expected election requirement';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%elected%', v_message);
  END;
  BEGIN
    PERFORM public.certify_auditor_election(public.open_auditor_election(v_community, CURRENT_DATE, CURRENT_DATE + 365, CURRENT_DATE, CURRENT_DATE + 1));
    RAISE EXCEPTION 'expected certification to wait until voting ends';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%still open%', v_message);
  END;
  v_election := public.open_auditor_election(v_community, CURRENT_DATE, CURRENT_DATE + 365, CURRENT_DATE - 1, CURRENT_DATE);
  PERFORM public._put('election', v_election::text);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
SET ROLE authenticated;
SELECT public.cast_auditor_ballot(public._get('election')::uuid, '22222222-2222-2222-2222-222222222222');
DO $$
DECLARE
  v_message text;
BEGIN
  BEGIN
    PERFORM public.cast_auditor_ballot(public._get('election')::uuid, '55555555-5555-5555-5555-555555555555');
    RAISE EXCEPTION 'expected outsider rejection';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%not a member%', v_message);
  END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
SELECT public.cast_auditor_ballot(public._get('election')::uuid, '22222222-2222-2222-2222-222222222222');
SELECT public.certify_auditor_election(public._get('election')::uuid);

DO $$
DECLARE
  v_community uuid := public._get('community')::uuid;
  v_paid uuid := public._get('paid_expense')::uuid;
  v_seen integer;
  v_ticket text;
BEGIN
  PERFORM public.review_subject(v_community, 'expense', v_paid, 'verified', 'Invoice matches the payment');
  PERFORM public._assert(
    (SELECT auditor_status FROM public.expenses WHERE id = v_paid) = 'verified',
    'auditor verification is recorded'
  );
  PERFORM public._assert(
    (SELECT amount FROM public.expenses WHERE id = v_paid) = 3000,
    'auditor review does not change the expense amount'
  );

  v_ticket := public.create_ticket(v_community, 'Water pressure', 'Water', 'Low pressure in the morning', 'public', '102', 'medium');
  PERFORM public._assert(v_ticket ~ '^SOC-2026-[0-9]{5}$', 'ticket numbers use SOC-YYYY-XXXXX');
  PERFORM public._put('public_ticket', v_ticket);

  SELECT COUNT(*) INTO v_seen FROM public.maintenance_demands;
  PERFORM public._assert(v_seen = 2, 'an elected auditor can review individual demands');
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid := public._get('community')::uuid;
  v_seen integer;
  v_private text;
BEGIN
  SELECT COUNT(*) INTO v_seen FROM public.maintenance_demands;
  PERFORM public._assert(v_seen = 1, 'another resident does not see the first demand');
  PERFORM public._assert(
    (SELECT collected FROM public.collection_summary(v_community, public._get('period')::uuid)) = 100,
    'collection totals stay available without listing every payer'
  );
  SELECT COUNT(*) INTO v_seen FROM public.tickets WHERE ticket_number = public._get('public_ticket');
  PERFORM public._assert(v_seen = 1, 'public concerns are visible to residents');
  v_private := public.create_ticket(v_community, 'My receipt', 'Finance', 'Please check my payment', 'private', '101', 'low');
  PERFORM public._put('private_ticket', v_private);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;

SELECT public._assert(
  (SELECT COUNT(*) FROM public.tickets WHERE ticket_number = public._get('private_ticket')) = 0,
  'private concerns stay with the resident and the committee'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
SET ROLE authenticated;
SELECT public._put('other', public.create_community('Other Homes', 'Road 2', 'Hyderabad', 1000, 5000, 10)::text);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
SELECT public._assert(
  (SELECT COUNT(*) FROM public.communities WHERE id = public._get('other')::uuid) = 0,
  'communities are isolated from each other'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_community uuid := public._get('community')::uuid;
  v_bank uuid := public._get('bank')::uuid;
  v_recon uuid;
  v_statement uuid;
  v_book numeric;
BEGIN
  SELECT book_balance INTO v_book FROM public.bank_balances(v_community) WHERE account_id = v_bank;
  BEGIN
    PERFORM public.start_reconciliation(public._get('other')::uuid, v_bank, '2026-04-01', '2026-04-30', 0, v_book);
    RAISE EXCEPTION 'expected cross-community bank rejection';
  EXCEPTION WHEN OTHERS THEN
    PERFORM public._assert(SQLERRM LIKE '%not in this community%', SQLERRM);
  END;
  v_recon := public.start_reconciliation(v_community, v_bank, '2026-05-01', '2026-05-31', 0, 0);
  PERFORM public._assert(public.complete_reconciliation(v_recon) <> 0, 'a statement that ignores the book balance is not zero');
  PERFORM public._assert(
    (SELECT status FROM public.bank_reconciliations WHERE id = v_recon) = 'open',
    'a non-zero book difference stays open and is stored'
  );
  v_recon := public.start_reconciliation(v_community, v_bank, '2026-04-01', '2026-04-30', 0, v_book);
  PERFORM public.complete_reconciliation(v_recon);
  PERFORM public._assert(
    (SELECT status FROM public.bank_reconciliations WHERE id = v_recon) = 'reconciled',
    'a zero difference can be marked reconciled'
  );
  v_statement := public.close_month(v_community, '2026-04-01', '2026-04-30');
  PERFORM public._assert(
    (SELECT due_on FROM public.financial_statements WHERE id = v_statement) = '2026-05-10',
    'the statement stores the configured publication deadline'
  );
  PERFORM public.submit_statement(v_statement);
  PERFORM public._put('statement', v_statement::text);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
SELECT public.review_statement(public._get('statement')::uuid, 'verified', 'Records agree');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
SET ROLE authenticated;

DO $$
DECLARE
  v_statement uuid := public._get('statement')::uuid;
  v_snapshot jsonb;
  v_message text;
BEGIN
  PERFORM public._assert(public.publish_statement(v_statement, false) = 1, 'publishing stores a statement version');
  BEGIN
    PERFORM public.publish_statement(v_statement, true);
    RAISE EXCEPTION 'expected a second publish to fail';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%has not been reviewed%', v_message);
  END;
  SELECT snapshot INTO v_snapshot FROM public.financial_statement_versions WHERE statement_id = v_statement AND version_number = 1;
  PERFORM public._put('snapshot', v_snapshot::text);
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
SELECT public.review_statement(public._get('statement')::uuid, 'verified', 'Correction reviewed');
SELECT public._assert(
  (SELECT status FROM public.financial_statements WHERE id = public._get('statement')::uuid) = 'published',
  'an auditor review does not unpublish a statement'
);
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
SET ROLE authenticated;
SELECT public._assert(
  public.append_statement_version(public._get('statement')::uuid, false) = 2,
  'a reviewed correction stores a new version'
);
SELECT public._assert(
  (SELECT snapshot::text FROM public.financial_statement_versions WHERE statement_id = public._get('statement')::uuid AND version_number = 1) = public._get('snapshot'),
  'the original published snapshot is unchanged'
);
RESET ROLE;

DO $$
DECLARE
  v_message text;
BEGIN
  BEGIN
    UPDATE public.financial_statement_versions SET snapshot = '{}'::jsonb;
    RAISE EXCEPTION 'expected immutable snapshot';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    PERFORM public._assert(v_message LIKE '%immutable%', v_message);
  END;
END $$;
