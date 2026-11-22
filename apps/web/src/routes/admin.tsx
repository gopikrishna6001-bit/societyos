import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Building2,
  Car,
  Clock,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Megaphone,
  Receipt,
  ShieldCheck,
  Wallet,
  SquareParking,
  Ticket,
  TrendingUp,
  Users,
  UserCheck,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../lib/api'
import { AuthControls, CLERK_ENABLED } from '@/components/auth-controls'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useDashboardPath } from '@/lib/dashboard-path'
import { demoPathForAdmin, isLiveApiConfigured } from '@/lib/live-mode'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    // Zero-config hosted deploys have no API secrets — send Live URLs to the full demo.
    if (!isLiveApiConfigured()) {
      throw redirect({ href: demoPathForAdmin(location.pathname) })
    }
  },
  component: AdminLayout,
})

const NAV: { to: string; tKey: string; icon: LucideIcon }[] = [
  { to: '/admin', tKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/admin/society', tKey: 'nav.society', icon: Home },
  { to: '/admin/apartments', tKey: 'nav.apartments', icon: Building2 },
  { to: '/admin/residents', tKey: 'nav.residents', icon: Users },
  { to: '/admin/guards', tKey: 'nav.guards', icon: ShieldCheck },
  { to: '/admin/duty', tKey: 'nav.duty', icon: Clock },
  { to: '/admin/house-help', tKey: 'nav.houseHelp', icon: HeartHandshake },
  { to: '/admin/vehicles', tKey: 'nav.vehicles', icon: Car },
  { to: '/admin/parking', tKey: 'nav.parking', icon: SquareParking },
  { to: '/admin/visitors', tKey: 'nav.visitors', icon: UserCheck },
  { to: '/admin/pre-approvals', tKey: 'nav.preApprovals', icon: Ticket },
  { to: '/admin/tickets', tKey: 'nav.tickets', icon: Wrench },
  { to: '/admin/billing', tKey: 'nav.billing', icon: Receipt },
  { to: '/admin/expenses', tKey: 'nav.expenses', icon: Wallet },
  { to: '/admin/reports', tKey: 'nav.reports', icon: BarChart3 },
  { to: '/admin/analytics', tKey: 'nav.analytics', icon: TrendingUp },
  { to: '/admin/notices', tKey: 'nav.notices', icon: Megaphone },
]

export function AdminLayout() {
  const dashboardPath = useDashboardPath()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const setupOnly =
    pathname === '/demo/setup' ||
    pathname.startsWith('/demo/setup/') ||
    pathname === '/admin/setup' ||
    pathname.startsWith('/admin/setup/')
  const demo = dashboardPath('/admin') === '/demo'
  const health = useQuery({
    queryKey: ['health'],
    queryFn: apiClient.health,
    retry: false,
    enabled: !demo,
  })
  const { t } = useT()
  const apiOffline = !demo && !health.isLoading && !health.isSuccess

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden overscroll-none touch-pan-y">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {!setupOnly && (
          <aside className="bg-card hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
            <a href="/" className="mb-6 flex items-center gap-2 px-2">
              <img src="/brand/sabha-mark-navy.png" alt="" width={28} height={28} className="size-7 rounded-md" />
              <span className="font-display text-lg font-bold tracking-tight">SABHA</span>
            </a>
            <nav className="flex flex-col gap-1">
              {NAV.map(({ to, tKey, icon: Icon }) => (
                <Link
                  key={to}
                  to={dashboardPath(to)}
                  activeOptions={{ exact: to === '/admin' }}
                  className={cn(
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  )}
                  activeProps={{ className: 'bg-accent text-accent-foreground' }}
                >
                  <Icon className="size-4" />
                  {t(tKey)}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            {!setupOnly && (
              <nav className="scrollbar-none flex max-w-[55vw] gap-1 overflow-x-auto overscroll-x-contain md:hidden">
                {NAV.map(({ to, tKey }) => (
                  <Link
                    key={to}
                    to={dashboardPath(to)}
                    activeOptions={{ exact: to === '/admin' }}
                    className="text-muted-foreground rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap"
                    activeProps={{ className: 'text-foreground' }}
                  >
                    {t(tKey)}
                  </Link>
                ))}
              </nav>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {!setupOnly &&
                (demo ? (
                  <Badge>{t('demo.badge')}</Badge>
                ) : (
                  <Badge variant={health.isSuccess ? 'default' : 'destructive'}>
                    {t('header.api')}{' '}
                    {health.isLoading ? '…' : health.isSuccess ? t('header.apiOnline') : t('header.apiOffline')}
                  </Badge>
                ))}
              <LanguageSwitcher />
              {CLERK_ENABLED && !demo && <AuthControls />}
              <ThemeToggle />
            </div>
          </header>

          {apiOffline && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50 sm:px-6">
              <p className="font-semibold">Live API is offline</p>
              <p className="mt-1 text-sm">
                The society API is unreachable right now, so live writes will fail. The interactive demo has the full
                SABHA product with sample data and needs no database or auth keys.
              </p>
              <a href="/demo" className="mt-2 inline-flex text-sm font-semibold underline">
                Open full demo dashboard
              </a>
            </div>
          )}

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
