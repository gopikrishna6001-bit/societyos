#!/usr/bin/env node
/**
 * End-to-end role/feature walk for MNR Apartment against a running local API.
 * Auth: x-user-id (no Clerk). Requires seed-mnr to have been applied.
 */
const API = process.env.API_URL ?? 'http://127.0.0.1:8787'
const ADMIN = '00000000-0000-0000-0000-000000000001'
const PENDING = '00000000-0000-0000-0000-000000000002'
const RESIDENT = '00000000-0000-0000-0000-000000000003'
const GUARD_USER = '00000000-0000-0000-0000-000000000004'
const STAFF = '00000000-0000-0000-0000-000000000005'

const results = []

async function api(userId, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId,
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, body }
}

function check(role, feature, ok, detail = '') {
  results.push({ role, feature, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  [${role}] ${feature}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  const health = await fetch(`${API}/health`).then((r) => r.json())
  check('system', 'API health', health.status === 'ok')

  // --- ADMIN ---
  const society = await api(ADMIN, '/society')
  check('ADMIN', 'read society', society.ok && society.body?.name === 'MNR Apartment', society.body?.name)

  const putSociety = await api(ADMIN, '/society', {
    method: 'PUT',
    body: JSON.stringify({
      name: 'MNR Apartment',
      address: 'MNR Apartment, Main Road',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
    }),
  })
  check('ADMIN', 'update society', putSociety.ok)

  const apts = await api(ADMIN, '/apartments')
  const mnrHome = (apts.body ?? []).find((a) => a.tower === 'MNR' && a.apartmentNo === '101')
  check('ADMIN', 'list apartments', apts.ok && mnrHome, mnrHome ? `MNR-101 ${mnrHome.id}` : 'missing MNR-101')

  const notice = await api(ADMIN, '/notices', {
    method: 'POST',
    body: JSON.stringify({
      title: 'MNR AGM reminder',
      body: 'Annual general meeting this Sunday at 6pm in the lobby.',
      category: 'GENERAL',
      priority: 'HIGH',
    }),
  })
  check('ADMIN', 'publish notice', notice.ok, notice.body?.id)

  const pendingUsers = await api(ADMIN, '/users?status=PENDING')
  const pending = (pendingUsers.body ?? []).find((u) => u.id === PENDING)
  check('ADMIN', 'approval queue', pendingUsers.ok && !!pending)

  if (pending && mnrHome) {
    const approve = await api(ADMIN, `/users/${PENDING}/approve`, {
      method: 'POST',
      body: JSON.stringify({ apartmentId: mnrHome.id, relation: 'TENANT', isPrimary: false }),
    })
    check('ADMIN', 'approve resident + residency', approve.ok && approve.body?.status === 'APPROVED')
  } else {
    check('ADMIN', 'approve resident + residency', false, 'missing pending user or apartment')
  }

  const guards = await api(ADMIN, '/guards')
  const gate = (guards.body ?? [])[0]
  check('ADMIN', 'list guards', guards.ok && !!gate, gate?.name)

  const parking = await api(ADMIN, '/parking/slots', {
    method: 'POST',
    body: JSON.stringify({ slotNumber: 'MNR-V1', type: 'OPEN', isVisitor: true }),
  })
  check(
    'ADMIN',
    'create visitor parking slot',
    parking.ok || parking.status === 409,
    parking.ok ? parking.body?.slotNumber : `status ${parking.status}`,
  )

  // --- RESIDENT ---
  const mine = await api(RESIDENT, '/apartments/mine')
  check('RESIDENT', 'my apartments', mine.ok && Array.isArray(mine.body), `count=${mine.body?.length ?? 0}`)

  const notices = await api(RESIDENT, '/notices')
  check('RESIDENT', 'read notices', notices.ok && (notices.body?.length ?? 0) > 0)

  if (notice.ok && notice.body?.id) {
    const markRead = await api(RESIDENT, `/notices/${notice.body.id}/read`, { method: 'POST' })
    check('RESIDENT', 'mark notice read', markRead.ok || markRead.status === 409, `status ${markRead.status}`)
  }

  const residentAptId = mine.body?.[0]?.id ?? mnrHome?.id
  const gateAptId = mnrHome?.id ?? residentAptId
  if (residentAptId) {
    const pre = await api(RESIDENT, '/visitors/pre-approvals', {
      method: 'POST',
      body: JSON.stringify({
        apartmentId: residentAptId,
        visitorName: 'Courier for MNR flat',
        approvalType: 'ONE_TIME',
      }),
    })
    check('RESIDENT', 'create pre-approval', pre.ok, pre.body?.code)

    const ticket = await api(RESIDENT, '/tickets', {
      method: 'POST',
      body: JSON.stringify({
        apartmentId: residentAptId,
        title: 'Water leak in bathroom',
        description: 'Continuous drip under the sink at MNR Apartment.',
        category: 'PLUMBING',
        priority: 'HIGH',
      }),
    })
    check('RESIDENT', 'raise maintenance ticket', ticket.ok, ticket.body?.id)

    if (ticket.ok && ticket.body?.id) {
      const start = await api(ADMIN, `/tickets/${ticket.body.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      })
      check('ADMIN', 'start ticket', start.ok, start.body?.status)

      const assign = await api(ADMIN, `/tickets/${ticket.body.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: STAFF }),
      })
      check('ADMIN', 'assign ticket to STAFF', assign.ok, assign.body?.assignedTo ?? `status ${assign.status}`)
    }

    var preCode = pre.ok ? pre.body?.code : null
    var preId = pre.ok ? pre.body?.id : null
  } else {
    check('RESIDENT', 'create pre-approval', false, 'no apartment')
    check('RESIDENT', 'raise maintenance ticket', false, 'no apartment')
  }

  // --- GUARD ---
  if (gateAptId) {
    const entry = await api(GUARD_USER, '/visitors', {
      method: 'POST',
      body: JSON.stringify({
        apartmentId: gateAptId,
        visitorName: 'Walk-in Guest',
        type: 'GUEST',
        purpose: 'Family visit',
      }),
    })
    check('GUARD', 'register visitor at gate', entry.ok, entry.body?.id)

    if (entry.ok && entry.body?.id) {
      // Owner of MNR-101 (admin) approves gate walk-in for their flat.
      const approveVisit = await api(ADMIN, `/visitors/${entry.body.id}/approve`, { method: 'POST', body: '{}' })
      check('ADMIN', 'approve visitor (owner)', approveVisit.ok, approveVisit.body?.status)

      const checkin = await api(GUARD_USER, `/visitors/${entry.body.id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ guardId: gate?.id }),
      })
      check('GUARD', 'check-in visitor', checkin.ok, checkin.body?.status)

      const checkout = await api(GUARD_USER, `/visitors/${entry.body.id}/checkout`, {
        method: 'POST',
        headers: gate?.id ? { 'x-guard-id': gate.id } : {},
        body: '{}',
      })
      check('GUARD', 'check-out visitor', checkout.ok, checkout.body?.status)
    }

    if (preCode) {
      const redeem = await api(GUARD_USER, '/visitors/pre-approvals/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: preCode, guardId: gate?.id }),
      })
      check('GUARD', 'redeem pre-approval code', redeem.ok, redeem.body?.id ?? `status ${redeem.status}`)
    }

    if (gate?.id) {
      const clockIn = await api(GUARD_USER, `/guards/${gate.id}/duty/clock-in`, {
        method: 'POST',
        headers: { 'x-device-id': 'mnr-e2e-device-1' },
        body: JSON.stringify({ lat: 17.385, lng: 78.4867 }),
      })
      check(
        'GUARD',
        'duty clock-in',
        clockIn.ok || clockIn.status === 409,
        clockIn.ok ? clockIn.body?.id : `status ${clockIn.status}`,
      )
      if (clockIn.ok && clockIn.body?.id) {
        const clockOut = await api(GUARD_USER, `/guards/duty/${clockIn.body.id}/clock-out`, {
          method: 'POST',
          headers: { 'x-device-id': 'mnr-e2e-device-1' },
          body: JSON.stringify({ lat: 17.385, lng: 78.4867 }),
        })
        check('GUARD', 'duty clock-out', clockOut.ok)
      }
    }

    const plate = await api(GUARD_USER, '/vehicles/verify?plate=TS09MNR0001')
    check(
      'GUARD',
      'verify registered vehicle',
      plate.ok && (plate.body?.registered === true || plate.body?.vehicle),
      JSON.stringify(plate.body)?.slice(0, 120),
    )
  }

  // --- STAFF ---
  const staffTickets = await api(STAFF, '/tickets')
  check('STAFF', 'list tickets (auth)', staffTickets.ok || staffTickets.status === 403, `status ${staffTickets.status}`)

  const staffSociety = await api(STAFF, '/society')
  check('STAFF', 'read society', staffSociety.ok && staffSociety.body?.name === 'MNR Apartment')

  const staffNotices = await api(STAFF, '/notices')
  check('STAFF', 'read notices', staffNotices.ok)

  // Role denial smoke
  const deny = await api(RESIDENT, '/society', {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Hacked',
      address: 'x',
      city: 'x',
      state: 'x',
      pincode: '500001',
    }),
  })
  check('RESIDENT', 'cannot update society', deny.status === 403, `status ${deny.status}`)

  const failed = results.filter((r) => !r.ok)
  console.log('\n--- summary ---')
  console.log(`passed ${results.length - failed.length}/${results.length}`)
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL [${f.role}] ${f.feature}: ${f.detail}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
