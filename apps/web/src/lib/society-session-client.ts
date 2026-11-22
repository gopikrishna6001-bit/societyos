import { createDemoData, type DemoData } from '@opensociety/shared/demo'
import { createDemoClient } from './demo/client'
import { readSocietySession, type SocietySession } from './society-auth'
import { loadSocietySnapshot, type SocietySnapshot } from './society-data'

function towerAndNo(flatNumber: string): { tower: string; apartmentNo: string } {
  const m = flatNumber.match(/^([A-Za-z]+)\s*[- ]\s*(.+)$/)
  if (m) return { tower: m[1].toUpperCase(), apartmentNo: m[2] }
  return { tower: 'A', apartmentNo: flatNumber }
}

function roleFor(session: SocietySession, residentId: string): DemoData['users'][number]['role'] {
  if (residentId !== session.resident.id) return 'RESIDENT'
  if (session.role === 'super_admin' || session.role === 'secretary' || session.role === 'president') return 'ADMIN'
  if (session.role === 'treasurer' || session.role === 'committee') return 'STAFF'
  return 'RESIDENT'
}

/** Map live MNR snapshot into the same in-memory shape the demo Admin screens already use. */
export function buildSocietySessionData(snapshot: SocietySnapshot, session: SocietySession): DemoData {
  const base = createDemoData()
  const now = new Date().toISOString()
  const stamp = { createdAt: now, updatedAt: now }
  const societyName = snapshot.society.display_name || snapshot.society.name

  const apartments = snapshot.flats.map((flat) => {
    const { tower, apartmentNo } = towerAndNo(flat.number)
    return {
      id: flat.id,
      tower,
      apartmentNo,
      floor: flat.floor,
      bhkType: (flat.type as DemoData['apartments'][number]['bhkType']) ?? null,
      isActive: true,
      ...stamp,
    }
  })

  const users = snapshot.residents.map((r) => ({
    id: r.id,
    clerkId: `society_${r.id}`,
    email: r.phone ? `${r.phone}@societyos.app` : null,
    phone: r.phone,
    name: r.name,
    role: roleFor(session, r.id),
    status: 'APPROVED' as const,
    isActive: r.status !== 'inactive',
    ...stamp,
  }))

  if (!users.some((u) => u.id === session.resident.id)) {
    users.unshift({
      id: session.resident.id,
      clerkId: `society_${session.resident.id}`,
      email: session.resident.phone ? `${session.resident.phone}@societyos.app` : null,
      phone: session.resident.phone,
      name: session.resident.name,
      role: roleFor(session, session.resident.id),
      status: 'APPROVED',
      isActive: true,
      ...stamp,
    })
  }

  return {
    ...base,
    society: {
      id: snapshot.society.id,
      name: societyName,
      address: 'Hyderabad',
      city: snapshot.society.city || 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      gstin: null,
      ...stamp,
    },
    billConfig: { ...base.billConfig, updatedBy: session.resident.id, updatedAt: now },
    apartments,
    users,
    // Keep the admin shell usable; module lists start empty until live ops data is wired.
    guards: [],
    duty: [],
    devices: [],
    visitors: [],
    preApprovals: [],
    notices: [],
    tickets: [],
    houseHelp: [],
    reviews: [],
    assignments: [],
    attendance: [],
    vehicles: [],
    parking: [],
    bills: [],
    payments: [],
    vendors: [],
    expenses: [],
  }
}

let client: ReturnType<typeof createDemoClient> | undefined
let loading: Promise<ReturnType<typeof createDemoClient>> | undefined

export function hasSocietySessionClient() {
  return !!readSocietySession()?.access_token
}

export async function getSocietySessionClient() {
  if (typeof window === 'undefined') throw new Error('Society session is browser-only')
  if (client) return client
  if (loading) return loading
  loading = (async () => {
    const session = readSocietySession()
    if (!session?.access_token) throw new Error('Not signed in')
    const snapshot = await loadSocietySnapshot()
    client = createDemoClient(buildSocietySessionData(snapshot, session))
    return client
  })().finally(() => {
    loading = undefined
  })
  return loading
}

export function resetSocietySessionClient() {
  client = undefined
  loading = undefined
}
