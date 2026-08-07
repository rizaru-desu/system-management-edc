import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import { Button } from './button.tsx'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog.tsx'

/** Desktop width per `size`; every size stays near-full-width on mobile. */
const SIZE_CLASSES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
  full: 'sm:max-w-[95vw]',
} as const

export type BaseModalSize = keyof typeof SIZE_CLASSES

export interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Header title (left side); ReactNode so badges/icon chips compose in. */
  title?: React.ReactNode
  /** Muted line under the title; wired to aria-describedby by Radix. */
  description?: React.ReactNode
  /**
   * Extra pinned header content below the description (filters, pickers,
   * contextual notes) — stays visible while the body scrolls.
   */
  headerExtra?: React.ReactNode
  children: React.ReactNode
  /** Desktop width; defaults to `md`. */
  size?: BaseModalSize
  /** Pinned action row; omit for footer-less dialogs. */
  footer?: React.ReactNode
  /**
   * While true the modal locks: the close button hides, Esc/overlay
   * dismissal is swallowed (see `preventCloseWhenLoading`) and every
   * form control inside the footer is disabled, so a submit can't be
   * double-fired or abandoned mid-flight.
   */
  loading?: boolean
  /** false removes the "X" button and disables overlay dismissal. */
  closable?: boolean
  /** false anchors the modal near the top instead of vertical center. */
  centered?: boolean
  /**
   * true (default) unmounts the content on close — Radix's behavior.
   * false keeps it mounted (hidden) so internal state survives re-opens.
   */
  destroyOnClose?: boolean
  /** Whether `loading` also blocks Esc/overlay/X closing (default true). */
  preventCloseWhenLoading?: boolean
  /**
   * Disables overlay/outside-pointer dismissal even when idle — for forms
   * where a stray backdrop click would throw work away. Esc and the "X"
   * button still close (route them through an unsaved-changes guard).
   */
  disableOutsideClose?: boolean
  /** Extra classes for the dialog panel (width/theme overrides). */
  className?: string
  /** Extra classes for the scrollable content area. */
  contentClassName?: string
}

/**
 * The application-wide modal: a Radix dialog laid out as
 * `Header → scrollable Content → Footer`, where the header (title + "X")
 * and the footer stay pinned while only the content scrolls — capped at
 * 90vh, near-full-width on mobile, sized by the `size` prop on desktop.
 * Accessibility (focus trap/restore, Esc, aria-labelledby/-describedby)
 * comes from the underlying dialog primitives.
 *
 * Compose feature dialogs from this instead of raw Dialog* primitives:
 * confirmations via {@link ConfirmModal}, forms by rendering the `<form>`
 * as children with the submit button in `footer` linked via the HTML
 * `form` attribute.
 */
export function BaseModal({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  children,
  size = 'md',
  footer,
  loading = false,
  closable = true,
  centered = true,
  destroyOnClose = true,
  preventCloseWhenLoading = true,
  disableOutsideClose = false,
  className,
  contentClassName,
}: BaseModalProps) {
  const closeLocked = loading && preventCloseWhenLoading

  const handleOpenChange = (nextOpen: boolean) => {
    // Esc, overlay and the "X" all funnel through here — one guard covers
    // every dismissal path while a request is in flight.
    if (!nextOpen && closeLocked) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={closable && !closeLocked}
        disableOutsideClose={disableOutsideClose || !closable || closeLocked}
        forceMount={destroyOnClose ? undefined : true}
        aria-busy={loading || undefined}
        className={cn(
          SIZE_CLASSES[size],
          !centered && 'top-10 translate-y-0',
          !destroyOnClose && 'data-[state=closed]:hidden',
          className,
        )}
      >
        {title !== undefined ? (
          <DialogHeader className="-mx-6 border-b border-brand-100 px-6 pb-4">
            <DialogTitle className="font-display pr-6 text-xl font-bold text-brand-900">
              {title}
            </DialogTitle>
            {description !== undefined && (
              <DialogDescription className="text-brand-900/60">
                {description}
              </DialogDescription>
            )}
            {headerExtra}
          </DialogHeader>
        ) : (
          // Radix requires a title for screen readers even when the design
          // hides the header.
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}

        <DialogBody className={contentClassName}>{children}</DialogBody>

        {footer !== undefined && (
          <DialogFooter className="-mx-6 border-t border-brand-100 px-6 pt-4">
            {/* display:contents keeps the footer layout while natively
              disabling every button inside during `loading`. */}
            <fieldset disabled={loading} className="contents">
              {footer}
            </fieldset>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Icon-chip palettes of {@link ConfirmModal}. */
const CONFIRM_TONES = {
  danger: 'bg-rose-100 text-rose-600',
  warning: 'bg-amber-100 text-amber-600',
  info: 'bg-brand-500/10 text-brand-500',
} as const

export interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon: LucideIcon
  /** Chip palette; pick `danger` for destructive confirmations. */
  tone?: keyof typeof CONFIRM_TONES
  title: string
  description: React.ReactNode
  /** Optional extra content between the description and the actions. */
  children?: React.ReactNode
  cancelLabel?: string
  confirmLabel: string
  confirmVariant?: React.ComponentProps<typeof Button>['variant']
  confirmDisabled?: boolean
  loading?: boolean
  /** Runs on confirm; the modal closes afterwards (unless loading). */
  onConfirm: () => void
  /** Runs on cancel/dismiss; defaults to just closing. */
  onCancel?: () => void
}

/**
 * The shared confirmation dialog: icon chip + title, a description, an
 * optional note, and Cancel/confirm actions — the one layout behind every
 * delete/publish/status-toggle confirmation, built on {@link BaseModal}
 * (never `window.confirm`).
 */
export function ConfirmModal({
  open,
  onOpenChange,
  icon: Icon,
  tone = 'danger',
  title,
  description,
  children,
  cancelLabel = 'Cancel',
  confirmLabel,
  confirmVariant = 'default',
  confirmDisabled = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    // Dismissing (Esc / overlay / X) counts as cancelling.
    if (!nextOpen) onCancel?.()
    onOpenChange(nextOpen)
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      loading={loading}
      title={
        <span className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              CONFIRM_TONES[tone],
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* The description lives in the body (not the bordered header) so a
        note-less confirmation doesn't render an empty content strip; the
        DialogDescription element still wires up aria-describedby. */}
      <DialogDescription className="text-brand-900/60">
        {description}
      </DialogDescription>
      {children !== undefined && <div className="mt-3">{children}</div>}
    </BaseModal>
  )
}
