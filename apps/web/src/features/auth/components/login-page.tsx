import { useSearch } from '@tanstack/react-router'
import { Activity, Cpu, ShieldCheck } from 'lucide-react'

import { LoginForm } from './login-form.tsx'

const features = [
  { icon: ShieldCheck, label: 'PCI Aware' },
  { icon: Activity, label: 'Real-time Ops' },
  { icon: Cpu, label: '12k+ Terminals' },
]

export function LoginPage() {
  // Success banners set by the auth email flows: ?verified=1 lands here from
  // the verification link, ?reset=true from a completed password reset.
  const search = useSearch({ strict: false })
  const notice = search.verified
    ? 'Email verified — you can sign in now.'
    : search.reset
      ? 'Password updated — sign in with your new password.'
      : null

  return (
    <main className="theme-light grid min-h-screen w-full bg-[#F6F7F9] lg:grid-cols-2">
      {/* Left: Visual */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0E2748] p-12 text-white lg:flex">
        <div className="grid-bg absolute inset-0 opacity-30" />
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#3F6FA8]/30 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-[#3F6FA8]/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur">
            <Cpu className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            EDC.OS
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#DDE0EC]/70">
              Edc Lifecycle Platform
            </p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight xl:text-6xl">
              Run every
              <br />
              <span className="text-[#DDE0EC]">terminal,</span>
              <br />
              <span className="font-medium italic">end to end.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#DDE0EC]/70">
              Orchestrate warehouses, service points, merchants, deliveries and
              field engineers from a single operations canvas.
            </p>
          </div>

          <div className="grid max-w-md grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <feature.icon
                  className="mb-3 h-4 w-4 text-[#DDE0EC]"
                  strokeWidth={1.75}
                />
                <p className="text-xs leading-tight text-white/80">
                  {feature.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-[#DDE0EC]/60">
          © 2026 EDC.OS — Internal staging build
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2748] text-white">
              <Cpu className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="font-display text-lg font-bold text-[#0E2748]">
              EDC.OS
            </span>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#3F6FA8]">
            Sign in
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#0E2748] sm:text-4xl">
            Welcome back, operator.
          </h2>
          <p className="mt-2 text-sm text-[#0E2748]/60">
            Enter your credentials to access the operations console.
          </p>

          {notice && (
            <p
              role="status"
              className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              {notice}
            </p>
          )}

          <LoginForm className="mt-8" />

          <div className="mt-8 rounded-xl border border-[#DDE0EC] bg-[#DDE0EC]/40 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#3F6FA8]">
              Demo credentials
            </p>
            <div className="space-y-1 font-mono text-xs text-[#0E2748]/80">
              <div>
                admin@example.com / a-strong-password{' '}
                <span className="text-[#3F6FA8]">(Email)</span>
              </div>
              <div>
                einstein@ldap.forumsys.com / password{' '}
                <span className="text-[#3F6FA8]">(LDAP)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
