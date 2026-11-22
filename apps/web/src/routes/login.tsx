import { useState, type FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { loginWithPhonePin } from '@/lib/society-auth'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/login')({
  ssr: false,
  component: LoginPage,
  head: () => ({ meta: [{ title: 'Log in | SABHA' }] }),
})

function LoginPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await loginWithPhonePin(phone, pin)
      void navigate({ to: '/home' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src="/brand/sabha-mark-navy.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight">SABHA</span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-6 pb-16 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('login.title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('login.lead')}</p>

        <form onSubmit={onSubmit} className="bg-card mt-8 space-y-4 rounded-xl border p-5">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t('login.phone')}</Label>
            <Input
              id="phone"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9000000001"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin">{t('login.pin')}</Label>
            <Input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t('login.waiting') : t('login.submit')}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          <a href="/" className="underline">
            {t('login.backHome')}
          </a>
        </p>
      </main>
    </div>
  )
}
