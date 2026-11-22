const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://wzchqxwwezklxsxmjvyt.supabase.co'
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Y2hxeHd3ZXprbHhzeG1qdnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTg0ODUsImV4cCI6MjA4OTM3NDQ4NX0.2kKN1JZC5xpcy5FwG2RIjQrxv25Tgn_Epmj_lDyaFbM'

const AUTH_URL = `${SUPABASE_URL}/functions/v1/auth-login`
const STORAGE_KEY = 'sabha.society.session'

export type SocietyResident = {
  id: string
  name: string
  flat_number: string
  block: string | null
  phone: string | null
  type: string | null
  society_id: string | null
  is_super_admin?: boolean
  pin_changed?: boolean
}

export type SocietySession = {
  access_token: string
  refresh_token?: string
  expires_at?: number
  role: string
  resident: SocietyResident
}

type LoginResponse = {
  error?: string
  role?: string
  first_login?: boolean
  session?: { access_token: string; refresh_token?: string; expires_at?: number }
  resident?: SocietyResident
}

async function authLogin(body: Record<string, string>): Promise<LoginResponse> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  return (await res.json()) as LoginResponse
}

export async function loginWithPhonePin(phone: string, pin: string): Promise<SocietySession> {
  const data = await authLogin({
    action: 'login',
    phone: phone.replace(/\D/g, '').slice(-10),
    pin,
  })
  if (data.error || !data.session?.access_token || !data.resident || !data.role) {
    throw new Error(data.error || 'Sign in failed')
  }
  const session: SocietySession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    role: data.role,
    resident: data.resident,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function readSocietySession(): SocietySession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SocietySession
  } catch {
    return null
  }
}

export function clearSocietySession() {
  localStorage.removeItem(STORAGE_KEY)
}
