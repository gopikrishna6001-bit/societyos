/**
 * Hosted Pages builds often ship with no API URL. Without Neon/Clerk/API
 * secrets that is expected — use the full in-browser demo instead of a broken
 * Live dashboard.
 *
 * An explicitly set VITE_API_URL (including localhost for local Live / vite
 * preview) counts as configured. Only missing or CI placeholder URLs force demo.
 */
export function liveApiConfigured(apiUrl: string | undefined, _isDev = false): boolean {
  const raw = apiUrl?.trim()
  if (!raw) return false
  try {
    const url = new URL(raw)
    if (url.hostname === 'api.example.com') return false
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
