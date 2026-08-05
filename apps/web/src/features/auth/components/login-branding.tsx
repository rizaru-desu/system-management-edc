import { CheckCircle2 } from 'lucide-react'

import { BrandMark } from './brand-mark.tsx'

const highlights = [
  'Centralized monitoring for every EDC terminal',
  'Role-based access with single sign-on',
  'Real-time device status and audit trails',
]

export function LoginBranding() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-900 text-brand-50 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 size-96 rounded-full bg-brand-100/10 blur-3xl" />
      </div>

      <div className="relative">
        <BrandMark />
      </div>

      <div className="relative max-w-md">
        <h2 className="text-4xl leading-tight font-bold tracking-tight">
          Manage your entire EDC fleet from one place.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-brand-100/80">
          Provision terminals, track health, and control access — all in a
          single console built for operations teams.
        </p>

        <ul className="mt-10 space-y-4">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-100" />
              <span className="text-brand-50/90">{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-brand-100/50">
        © {new Date().getFullYear()} EDC Management. All rights reserved.
      </p>
    </aside>
  )
}
