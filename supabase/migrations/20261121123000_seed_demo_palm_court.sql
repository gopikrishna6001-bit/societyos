-- Seed DEMO · Palm Court with realistic sample records so each live screen has data.
-- Idempotent for the fixed demo community id. Does not invent fake money outside this community.

DO $$
DECLARE
  v_community uuid := '20000000-0000-4000-8000-000000000001';
  v_resident uuid := '10000000-0000-4000-8000-000000000001';
  v_treasurer uuid := '10000000-0000-4000-8000-000000000002';
  v_auditor uuid := '10000000-0000-4000-8000-000000000003';
  v_committee uuid := '10000000-0000-4000-8000-000000000004';
  v_admin uuid := '10000000-0000-4000-8000-000000000005';
  v_unit_101 uuid := '20000000-0000-4000-8000-000000000101';
  v_unit_102 uuid := '20000000-0000-4000-8000-000000000102';
  v_bank_row uuid := '30000000-0000-4000-8000-000000000001';
  v_bank_acct uuid := '30000000-0000-4000-8000-000000000011';
  v_fund_maint uuid := '30000000-0000-4000-8000-000000000021';
  v_fund_corpus uuid := '30000000-0000-4000-8000-000000000022';
  v_fund_reserve uuid := '30000000-0000-4000-8000-000000000023';
  v_period uuid := '30000000-0000-4000-8000-000000000031';
  v_demand_101 uuid := '30000000-0000-4000-8000-000000000041';
  v_demand_102 uuid := '30000000-0000-4000-8000-000000000042';
  v_open_entry uuid := '30000000-0000-4000-8000-000000000051';
  v_receipt_entry uuid := '30000000-0000-4000-8000-000000000052';
  v_pay_entry uuid := '30000000-0000-4000-8000-000000000053';
  v_cat_security uuid;
  v_cat_house uuid;
  v_expense_paid uuid := '30000000-0000-4000-8000-000000000061';
  v_expense_pending uuid := '30000000-0000-4000-8000-000000000062';
  v_ticket_open uuid := '30000000-0000-4000-8000-000000000071';
  v_ticket_resolved uuid := '30000000-0000-4000-8000-000000000072';
  v_meeting_up uuid := '30000000-0000-4000-8000-000000000081';
  v_meeting_past uuid := '30000000-0000-4000-8000-000000000082';
  v_resolution uuid := '30000000-0000-4000-8000-000000000091';
  v_notice uuid := '30000000-0000-4000-8000-0000000000a1';
  v_amenity uuid := '30000000-0000-4000-8000-0000000000b1';
  v_booking uuid := '30000000-0000-4000-8000-0000000000b2';
  v_pass uuid := '30000000-0000-4000-8000-0000000000c1';
  v_staff uuid := '30000000-0000-4000-8000-0000000000d1';
  v_asset uuid := '30000000-0000-4000-8000-0000000000e1';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.communities WHERE id = v_community) THEN
    RAISE EXCEPTION 'DEMO community missing — run demo login seed first';
  END IF;

  INSERT INTO public.units (id, community_id, block, number)
  VALUES
    (v_unit_101, v_community, 'A', '101'),
    (v_unit_102, v_community, 'A', '102')
  ON CONFLICT (id) DO UPDATE SET block = EXCLUDED.block, number = EXCLUDED.number;

  INSERT INTO public.unit_occupancies (id, community_id, unit_id, profile_id, relationship, started_on)
  VALUES
    ('20000000-0000-4000-8000-000000000301', v_community, v_unit_101, v_resident, 'owner', '2025-04-01'),
    ('20000000-0000-4000-8000-000000000302', v_community, v_unit_102, v_auditor, 'owner', '2025-04-01')
  ON CONFLICT (id) DO UPDATE SET ended_on = NULL, relationship = EXCLUDED.relationship;

  INSERT INTO public.expense_categories (community_id, name)
  SELECT v_community, name
  FROM (VALUES
    ('Security'), ('Housekeeping'), ('Electricity'), ('Water'), ('Lift maintenance'),
    ('Plumbing'), ('Civil repairs'), ('Gardening'), ('Administration'), ('Insurance'),
    ('Emergency repairs'), ('Other')
  ) AS v(name)
  ON CONFLICT (community_id, name) DO NOTHING;

  SELECT id INTO v_cat_security FROM public.expense_categories WHERE community_id = v_community AND name = 'Security';
  SELECT id INTO v_cat_house FROM public.expense_categories WHERE community_id = v_community AND name = 'Housekeeping';

  INSERT INTO public.bank_accounts (id, community_id, label, masked_number)
  VALUES (v_bank_row, v_community, 'HDFC Society Current', 'XXXX4521')
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

  INSERT INTO public.accounts (id, community_id, code, name, description, account_type, fund_kind, bank_account_id)
  VALUES
    (v_bank_acct, v_community, 'BANK-HDFC', 'HDFC Society Current', 'Operating bank ledger', 'bank', NULL, v_bank_row),
    (v_fund_maint, v_community, 'FUND-MAINT', 'Maintenance fund', 'Monthly maintenance', 'fund', 'maintenance', NULL),
    (v_fund_corpus, v_community, 'FUND-CORPUS', 'Corpus fund', 'Long-term corpus', 'fund', 'corpus', NULL),
    (v_fund_reserve, v_community, 'FUND-RESERVE', 'Reserve fund', 'Emergency / special reserve', 'fund', 'emergency', NULL)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, fund_kind = EXCLUDED.fund_kind;

  INSERT INTO public.journal_entries (
    id, community_id, entry_type, occurred_on, narration, idempotency_key, request_hash, created_by
  ) VALUES (
    v_open_entry, v_community, 'opening', '2026-04-01',
    'Opening balances for DEMO · Palm Court',
    'demo:opening:2026-04-01', 'demo-opening', v_treasurer
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.journal_lines (id, entry_id, account_id, direction, amount)
  VALUES
    ('30000000-0000-4000-8000-000000000151', v_open_entry, v_bank_acct, 'debit', 485000),
    ('30000000-0000-4000-8000-000000000152', v_open_entry, v_fund_maint, 'credit', 185000),
    ('30000000-0000-4000-8000-000000000153', v_open_entry, v_fund_corpus, 'credit', 220000),
    ('30000000-0000-4000-8000-000000000154', v_open_entry, v_fund_reserve, 'credit', 80000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.collection_periods (
    id, community_id, financial_year, period_month, due_on, status, created_by
  ) VALUES (
    v_period, v_community, '2026-27', '2026-11-01', '2026-11-10', 'open', v_treasurer
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.maintenance_demands (
    id, community_id, period_id, unit_id, expected_amount, additional_amount
  ) VALUES
    (v_demand_101, v_community, v_period, v_unit_101, 4500, 0),
    (v_demand_102, v_community, v_period, v_unit_102, 4500, 0)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.journal_entries (
    id, community_id, entry_type, occurred_on, narration, idempotency_key, request_hash, created_by
  ) VALUES (
    v_receipt_entry, v_community, 'receipt', '2026-11-05',
    'Maintenance receipt RCP-DEMO-102',
    'demo:receipt:102:2026-11', 'demo-receipt-102', v_treasurer
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.journal_lines (id, entry_id, account_id, direction, amount)
  VALUES
    ('30000000-0000-4000-8000-000000000155', v_receipt_entry, v_bank_acct, 'debit', 4500),
    ('30000000-0000-4000-8000-000000000156', v_receipt_entry, v_fund_maint, 'credit', 4500)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.collections (
    id, community_id, demand_id, amount, paid_on, payment_mode, bank_reference,
    receipt_number, journal_entry_id, idempotency_key, recorded_by
  ) VALUES (
    '30000000-0000-4000-8000-000000000043', v_community, v_demand_102, 4500, '2026-11-05',
    'upi', 'UPIDEMO102', 'RCP-DEMO-102', v_receipt_entry, 'demo:collection:102', v_treasurer
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.journal_entries (
    id, community_id, entry_type, occurred_on, narration, idempotency_key, request_hash, created_by
  ) VALUES (
    v_pay_entry, v_community, 'payment', '2026-11-08',
    'Security agency November retainer',
    'demo:payment:security:nov', 'demo-pay-sec', v_treasurer
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.journal_lines (id, entry_id, account_id, direction, amount)
  VALUES
    ('30000000-0000-4000-8000-000000000157', v_pay_entry, v_fund_maint, 'debit', 32000),
    ('30000000-0000-4000-8000-000000000158', v_pay_entry, v_bank_acct, 'credit', 32000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.expenses (
    id, community_id, expense_number, occurred_on, fund_account_id, category_id, description, payee,
    amount, payment_mode, payment_reference, is_emergency, submitted_by, approval_status, auditor_status,
    payment_status, journal_entry_id
  ) VALUES (
    v_expense_paid, v_community, 'EXP-2026-0001', '2026-11-08', v_fund_maint, v_cat_security,
    'Night security retainer for November', 'SecureGuard Hyderabad', 32000, 'bank_transfer', 'NEFT-SEC-1108',
    false, v_treasurer, 'approved', 'verified', 'paid', v_pay_entry
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.expenses (
    id, community_id, expense_number, occurred_on, fund_account_id, category_id, description, payee,
    amount, is_emergency, submitted_by, approval_status, auditor_status, payment_status
  ) VALUES (
    v_expense_pending, v_community, 'EXP-2026-0002', '2026-11-12', v_fund_maint, v_cat_house,
    'Deep cleaning of A-block lobby', 'Sparkle Services', 8500, false, v_treasurer,
    'pending', 'pending', 'unpaid'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tickets (
    id, community_id, ticket_number, subject, category, description, visibility, unit_id,
    priority, status, created_by, assigned_to
  ) VALUES
    (v_ticket_open, v_community, 'SOC-2026-00001', 'Lift vibration on floor 3', 'Lift and facilities',
     'Cabin rattles between floors 2 and 3 after 8pm.', 'public', v_unit_101, 'high', 'in_progress',
     v_resident, v_committee),
    (v_ticket_resolved, v_community, 'SOC-2026-00002', 'Street light near gate dark', 'Security',
     'Pole light near the main gate has been dark for three nights.', 'public', v_unit_101, 'medium',
     'resolved', v_resident, v_committee)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ticket_updates (id, ticket_id, author_id, body)
  VALUES
    ('30000000-0000-4000-8000-000000000073', v_ticket_open, v_committee, 'Vendor scheduled for Friday inspection.'),
    ('30000000-0000-4000-8000-000000000074', v_ticket_resolved, v_committee, 'Bulb replaced. Please confirm.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.meetings (
    id, community_id, meeting_type, title, held_on, venue, minutes, created_by, published_at
  ) VALUES
    (v_meeting_up, v_community, 'committee', 'November committee review',
     '2026-11-28 18:30:00+05:30', 'Clubhouse', NULL, v_committee, now()),
    (v_meeting_past, v_community, 'general_body', 'Q2 general body',
     '2026-09-20 11:00:00+05:30', 'Clubhouse', 'Accounts presented. Corpus transfer approved.',
     v_committee, '2026-09-21T10:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.resolutions (
    id, community_id, meeting_id, title, description, proposed_by, status,
    voting_starts_at, voting_ends_at
  ) VALUES (
    v_resolution, v_community, v_meeting_up,
    'Approve clubhouse projector purchase',
    'Authorize up to ₹45,000 from the reserve fund for a projector and screen for the clubhouse.',
    v_committee, 'under_discussion',
    now() - interval '1 day', now() + interval '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.community_notices (
    id, community_id, title, body, audience, pinned, published_at, created_by
  ) VALUES (
    v_notice, v_community, 'Diwali parking reminder',
    'Visitor cars must use the visitor bay. Overnight parking needs a pass from the gate.',
    'all', true, now() - interval '2 days', v_committee
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.amenities (id, community_id, name, description, is_active, requires_approval, slot_minutes)
  VALUES (v_amenity, v_community, 'Clubhouse', 'Ground-floor hall with AC', true, false, 60)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.amenity_bookings (
    id, community_id, amenity_id, unit_id, booked_by, starts_at, ends_at, purpose, status
  ) VALUES (
    v_booking, v_community, v_amenity, v_unit_101, v_resident,
    '2026-11-25 18:00:00+05:30', '2026-11-25 20:00:00+05:30', 'Family gathering', 'confirmed'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visitor_passes (
    id, community_id, unit_id, visitor_name, visitor_phone, purpose, pass_code, status,
    expected_at, created_by
  ) VALUES (
    v_pass, v_community, v_unit_101, 'Ravi Courier', '9000000001', 'Parcel delivery', 'PC101A',
    'expected', now() + interval '3 hours', v_resident
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.community_staff (
    id, community_id, full_name, role_title, phone, status
  ) VALUES (
    v_staff, v_community, 'Suresh Gate', 'Security supervisor', '9000000011', 'active'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.community_assets (
    id, community_id, name, category, location, status, notes, amc_ends_on
  ) VALUES (
    v_asset, v_community, 'DG set 62.5 kVA', 'Plant & machinery', 'Service yard', 'operational',
    'Annual AMC active', '2027-03-31'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
  SELECT v_community, v_resident, 'notice_published', 'Diwali parking reminder',
         'Visitor cars must use the visitor bay.'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE community_id = v_community AND recipient_id = v_resident AND title = 'Diwali parking reminder'
  );

  INSERT INTO public.notifications (community_id, recipient_id, event_type, title, body)
  SELECT v_community, v_treasurer, 'expense_pending', 'Expense awaiting decision',
         'EXP-2026-0002 · Deep cleaning of A-block lobby'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE community_id = v_community AND recipient_id = v_treasurer AND title = 'Expense awaiting decision'
  );
END $$;
