import { Check } from 'lucide-react'

import { cn } from '#/lib/utils.ts'

export interface WizardStep {
  key: string
  label: string
}

interface WizardStepperProps {
  steps: Array<WizardStep>
  /** Index of the step currently shown. */
  current: number
  /**
   * Steps before this index are freely revisitable; later ones stay locked
   * until the intervening steps validate.
   */
  onStepClick: (index: number) => void
}

/**
 * The numbered step strip on top of the shipment wizard — the project has
 * no stepper primitive, so this follows the hand-rolled tab strip of the
 * products detail page: brand tokens, an active underline, and check marks
 * on completed steps.
 */
export function WizardStepper({
  steps,
  current,
  onStepClick,
}: WizardStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-brand-100">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step.key} className="relative">
            <button
              type="button"
              onClick={() => done && onStepClick(index)}
              disabled={!done && !active}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'text-brand-900'
                  : done
                    ? 'text-brand-900/70 hover:text-brand-900'
                    : 'cursor-default text-brand-900/40',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                  active
                    ? 'bg-brand-500 text-white'
                    : done
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-brand-100 text-brand-900/50',
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </span>
              {step.label}
            </button>
            {active && (
              <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
