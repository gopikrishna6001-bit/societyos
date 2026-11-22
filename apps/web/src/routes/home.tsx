import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { clearSocietySession, readSocietySession, type SocietySession } from '@/lib/society-auth'
import {
  blockLabel,
  loadSocietySnapshot,
  type FlatRow,
  type ResidentRow,
  type SocietySnapshot,
} from '@/lib/society-data'
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
  const [data, setData] = useState<SocietySnapshot | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'units' | 'residents'>('overview')

  useEffect(() => {
    const s = readSocietySession()
    if (!s) {
      void navigate({ to: '/login' })
      return
    }
    setSession(s)
    void loadSocietySnapshot()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : t('home.loadFailed')))
      .finally(() => setLoading(false))
  }, [navigate, t])

  const stats = useMemo(() => {
    if (!data) return null
    const occupied = data.flats.filter((f) => f.status === 'occupied').length
    const vacant = data.flats.filter((f) => f.status === 'vacant').length
    return {
      flats: data.flats.length,
      occupied,
      vacant,
      residents: data.residents.length,
      blocks: data.blocks.length,
    }
  }, [data])

  if (!session || loading) {
    return <div className="bg-background text-muted-foreground min-h-screen p-8 text-sm">{t('common.loading')}</div>
  }

  const myBlock =
    session.resident.block === 'A'
      ? 'MNR The Heights'
      : session.resident.block === 'B'
        ? 'MNR The Majesty'
        : session.resident.block || '—'

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src="/brand/sabha-mark-navy.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight">SABHA</span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-4">
        <p className="text-muted-foreground text-sm">{t('home.signedInAs')}</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">{session.resident.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {session.resident.flat_number} · {myBlock} · {session.role}
        </p>

        {error ? (
          <p role="alert" className="text-destructive mt-6 text-sm">
            {error}
          </p>
        ) : null}

        {data && stats ? (
          <>
            <div className="bg-card mt-6 rounded-xl border p-5">
              <p className="font-semibold">{data.society.display_name || data.society.name}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {data.society.city || 'Hyderabad'} · {stats.flats} {t('home.units')} · {stats.blocks}{' '}
                {t('home.blocks')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label={t('home.occupied')} value={stats.occupied} />
                <Stat label={t('home.vacant')} value={stats.vacant} />
                <Stat label={t('home.residents')} value={stats.residents} />
                <Stat label={t('home.unitsLabel')} value={stats.flats} />
              </div>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto">
              {(
                [
                  ['overview', t('home.tabOverview')],
                  ['units', t('home.tabUnits')],
                  ['residents', t('home.tabResidents')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={
                    tab === id
                      ? 'bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium'
                      : 'bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-sm font-medium'
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'overview' ? (
              <div className="mt-4 space-y-4">
                {data.blocks.map((block) => {
                  const flats = data.flats.filter((f) => f.block_id === block.id)
                  const named = data.residents.filter((r) =>
                    flats.some((f) => f.number === r.flat_number),
                  )
                  return (
                    <section key={block.id} className="bg-card rounded-xl border p-5">
                      <h2 className="font-semibold">{blockLabel(block.name)}</h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {flats.length} {t('home.units')} · {named.length} {t('home.residents')} ·{' '}
                        {block.floors ?? '—'} {t('home.floors')}
                      </p>
                    </section>
                  )
                })}
              </div>
            ) : null}

            {tab === 'units' ? <UnitsList flats={data.flats} residents={data.residents} /> : null}
            {tab === 'residents' ? <ResidentsList residents={data.residents} /> : null}
          </>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/50 rounded-lg border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function UnitsList({ flats, residents }: { flats: FlatRow[]; residents: ResidentRow[] }) {
  const { t } = useT()
  const byFlat = new Map(residents.map((r) => [r.flat_number, r]))
  return (
    <ul className="bg-card mt-4 divide-y overflow-hidden rounded-xl border">
      {flats.map((flat) => {
        const owner = byFlat.get(flat.number)
        return (
          <li key={flat.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{flat.number}</p>
              <p className="text-muted-foreground">
                {owner?.name ?? t('home.noOwner')}
                {flat.type ? ` · ${flat.type}` : ''}
              </p>
            </div>
            <span className="text-muted-foreground shrink-0 capitalize">{flat.status ?? '—'}</span>
          </li>
        )
      })}
    </ul>
  )
}

function ResidentsList({ residents }: { residents: ResidentRow[] }) {
  const { t } = useT()
  if (residents.length === 0) {
    return <p className="text-muted-foreground mt-4 text-sm">{t('home.noResidents')}</p>
  }
  return (
    <ul className="bg-card mt-4 divide-y overflow-hidden rounded-xl border">
      {residents.map((r) => (
        <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-muted-foreground">
              {r.flat_number}
              {r.type ? ` · ${r.type}` : ''}
            </p>
          </div>
          <span className="text-muted-foreground shrink-0 tabular-nums">{r.phone ?? '—'}</span>
        </li>
      ))}
    </ul>
  )
}
