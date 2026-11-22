import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { clearSocietySession, readSocietySession, type SocietySession } from '@/lib/society-auth'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/home')({
  ssr: false,
  component: HomePage,
  head: () => ({ meta: [{ title: 'Home | SABHA' }] }),
})

function HomePage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [session, setSession] = useState<SocietySession | null>(null)

  useEffect(() => {
    const s = readSocietySession()
    if (!s) {
      void navigate({ to: '/login' })
      return
    }
    setSession(s)
  }, [navigate])

  if (!session) {
    return <div className="bg-background text-muted-foreground min-h-screen p-8 text-sm">{t('common.loading')}</div>
  }

  const blockLabel =
    session.resident.block === 'A'
      ? 'MNR The Heights'
      : session.resident.block === 'B'
        ? 'MNR The Majesty'
        : session.resident.block || '—'

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src="/brand/sabha-mark-navy.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight">SABHA</span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-6">
        <p className="text-muted-foreground text-sm">{t('home.signedInAs')}</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">{session.resident.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {session.resident.flat_number} · {blockLabel} · {session.role}
        </p>

        <div className="bg-card mt-8 space-y-3 rounded-xl border p-5 text-sm">
          <p className="font-medium">{t('home.societyName')}</p>
          <p className="text-muted-foreground">{t('home.societyHint')}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              clearSocietySession()
              void navigate({ to: '/login' })
            }}
          >
            {t('home.signOut')}
          </Button>
          <Button asChild variant="outline">
            <a href="/">{t('login.backHome')}</a>
          </Button>
        </div>
      </main>
    </div>
  )
}
