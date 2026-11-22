/**
 * Hosted Pages builds often ship with no API URL (or a localhost placeholder).
 * Without Neon/Clerk/API secrets that is expected — use the full in-browser demo
 * instead of a broken Live dashboard.
 *
 * Local `pnpm dev` still treats localhost API URLs as configured.
 */
export function liveApiConfigured(apiUrl: string | undefined, isDev: boolean): boolean {
  const raw = apiUrl?.trim()
  if (!raw) return false
  try {
    const url = new URL(raw)
    if (url.hostname === 'api.example.com') return false
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return isDev
    return true
  } catch {
    return false
  }
}

export function isLiveApiConfigured(): boolean {
  return liveApiConfigured(
    import.meta.env.VITE_API_URL as string | undefined,
    import.meta.env.DEV === true,
  )
}

export function demoPathForAdmin(pathname: string): string {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return pathname.replace(/^\/admin(?=\/|$)/, '/demo')
  }
  return '/demo'
}
