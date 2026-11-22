import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute, useLocation } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'

import { getQueryClient } from '../lib/query'
import { setAuthTokenGetter } from '../lib/api'
import { ThemeProvider, themeInitScript } from '../lib/theme'
import { I18nProvider } from '../lib/i18n'
import appCss from '../styles.css?url'
import { isDemoPath } from '../lib/demo/mode'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

function AuthBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthTokenGetter(() => getToken())
    return () => setAuthTokenGetter(null)
  }, [getToken])
  return null
}

function Providers({ children }: { children: React.ReactNode }) {
  const publicPage = useLocation({
    select: (location) => {
      const p = location.pathname
      return p === '/' || p === '/login' || p === '/home' || isDemoPath(p)
    },
  })
  const tree = (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  )
  if (!CLERK_PUBLISHABLE_KEY || publicPage) return tree
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthBridge />
      {tree}
    </ClerkProvider>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#031D27' },
      { title: 'SABHA — Clarity in Community.' },
      {
        name: 'description',
        content: 'SABHA is a Community Governance & Transparency Platform. Every rupee. Every decision. Accounted for.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="overflow-x-hidden overscroll-none">
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  )
}
