import { createFileRoute } from '@tanstack/react-router'
import { Shield, Receipt, Megaphone, Users, Ticket, Scale } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/')({ component: App })

const features = [
  { icon: Ticket, title: 'Guest passes', description: 'Pre-approve visitors, share QR passes, and keep a clear gate record.' },
  { icon: Shield, title: 'Gate desk', description: 'Scan passes, register walk-ins, and check people in and out with an audit trail.' },
  { icon: Receipt, title: 'Bills & dues', description: 'Maintenance bills, payment history, and proof review in one place.' },
  { icon: Megaphone, title: 'Notices', description: 'Society announcements with priority so residents stay informed.' },
  { icon: Users, title: 'Household help', description: 'Assign staff, track attendance, and manage who serves each home.' },
  { icon: Scale, title: 'Transparent ledgers', description: 'Every rupee and every decision accounted for — Clarity in Community.' },
]

function App() {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src="/brand/sabha-mark-navy.png" alt="" width={32} height={32} className="size-8 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight">SABHA</span>
        </a>
        <ThemeToggle />
      </header>

      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl font-black tracking-tight md:text-6xl">SABHA</h1>
          <p className="text-muted-foreground mt-4 text-xl">Clarity in Community.</p>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
            Community governance and transparency — guests, notices, bills, and everyday requests in one place.
            Every rupee. Every decision. Accounted for.
          </p>
          <p className="text-muted-foreground mt-5 text-sm">
            Start with the demo — it runs in your browser with sample data. No database or signup needed.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="/demo">Try the demo</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="size-8 text-cyan-500 dark:text-cyan-400" />
                <CardTitle className="mt-2">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
