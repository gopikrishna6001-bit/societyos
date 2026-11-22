import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { readSocietySession } from '@/lib/society-auth'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/home')({
  ssr: false,
  component: HomeRedirect,
  head: () => ({ meta: [{ title: 'Home | SABHA' }] }),
})

/** Legacy post-login URL — send signed-in users into the real admin shell. */
function HomeRedirect() {
  const { t } = useT()
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ to: readSocietySession() ? '/admin' : '/login' })
  }, [navigate])

  return <div className="bg-background text-muted-foreground min-h-screen p-8 text-sm">{t('common.loading')}</div>
}
