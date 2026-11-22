import { createFileRoute, Link } from '@tanstack/react-router'
import { Shield, Receipt, Megaphone, Users, Ticket, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/')({ component: App })

const FEATURES: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: Ticket, titleKey: 'landing.feature.guests.title', descKey: 'landing.feature.guests.desc' },
  { icon: Shield, titleKey: 'landing.feature.gate.title', descKey: 'landing.feature.gate.desc' },
  { icon: Receipt, titleKey: 'landing.feature.bills.title', descKey: 'landing.feature.bills.desc' },
  { icon: Megaphone, titleKey: 'landing.feature.notices.title', descKey: 'landing.feature.notices.desc' },
  { icon: Users, titleKey: 'landing.feature.help.title', descKey: 'landing.feature.help.desc' },
  { icon: Scale, titleKey: 'landing.feature.ledgers.title', descKey: 'landing.feature.ledgers.desc' },
]

function App() {
  const { t } = useT()
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src="/brand/sabha-mark-navy.png" alt="" width={32} height={32} className="size-8 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight">SABHA</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl font-black tracking-tight md:text-6xl">SABHA</h1>
          <p className="text-muted-foreground mt-4 text-xl">{t('landing.tagline')}</p>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">{t('landing.body')}</p>
          <p className="text-muted-foreground mt-5 text-sm">{t('landing.ctaHint')}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="/demo">{t('landing.exploreDemo')}</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/admin">{t('landing.openDashboard')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.titleKey}>
              <CardHeader>
                <f.icon className="size-8 text-cyan-500 dark:text-cyan-400" />
                <CardTitle className="mt-2">{t(f.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
