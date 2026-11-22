import { readSocietySession } from './society-auth'

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://wzchqxwwezklxsxmjvyt.supabase.co'
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Y2hxeHd3ZXprbHhzeG1qdnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTg0ODUsImV4cCI6MjA4OTM3NDQ4NX0.2kKN1JZC5xpcy5FwG2RIjQrxv25Tgn_Epmj_lDyaFbM'

export type SocietyRow = {
  id: string
  name: string
  display_name: string | null
  total_flats: number | null
  city: string | null
}

export type BlockRow = { id: string; name: string; floors: number | null }
export type FlatRow = {
  id: string
  number: string
  floor: number | null
  status: string | null
  type: string | null
  block_id: string | null
}
export type ResidentRow = {
  id: string
  name: string
  flat_number: string
  block: string | null
  type: string | null
  status: string | null
  phone: string | null
}

export type SocietySnapshot = {
  society: SocietyRow
  blocks: BlockRow[]
  flats: FlatRow[]
  residents: ResidentRow[]
}

async function rest<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

export async function loadSocietySnapshot(): Promise<SocietySnapshot> {
  const session = readSocietySession()
  if (!session?.access_token) throw new Error('Not signed in')
  const societyId = session.resident.society_id
  if (!societyId) throw new Error('No society on this account')
  const token = session.access_token
  const q = encodeURIComponent(`eq.${societyId}`)

  const [societies, blocks, flats, residents] = await Promise.all([
    rest<SocietyRow[]>(`societies?id=eq.${societyId}&select=id,name,display_name,total_flats,city`, token),
    rest<BlockRow[]>(`blocks?society_id=${q}&select=id,name,floors&order=name`, token),
    rest<FlatRow[]>(
      `flats?society_id=${q}&select=id,number,floor,status,type,block_id&order=number`,
      token,
    ),
    rest<ResidentRow[]>(
      `residents?society_id=${q}&select=id,name,flat_number,block,type,status,phone&order=flat_number`,
      token,
    ),
  ])

  const society = societies[0]
  if (!society) throw new Error('Society not found')
  return { society, blocks, flats, residents }
}

export function blockLabel(name: string): string {
  if (/heights/i.test(name)) return 'MNR The Heights'
  if (/majesty/i.test(name)) return 'MNR The Majesty'
  return name
}
