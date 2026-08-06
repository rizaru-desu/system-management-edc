import { useCallback, useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { AnyRouter } from '@tanstack/react-router'

export interface UnsavedChangesDialogProps {
  open: boolean
  onStay: () => void
  onLeave: () => void
}

/**
 * Centralized unsaved-changes guard for Create/Edit forms. While `when` is
 * true it protects every way of losing edits:
 *
 * - **In-app close/cancel** — wrap the closing action in `guard(action)`;
 *   when dirty, the action is parked and the custom confirmation dialog
 *   opens instead (never a native `window.confirm`).
 * - **Router navigation** (sidebar links, breadcrumb, browser Back) — a
 *   history blocker pauses the navigation behind the same dialog.
 * - **Browser refresh / tab close** — the native `beforeunload` prompt, kept
 *   only here because custom UI cannot replace that browser behavior.
 *
 * Render the returned `dialogProps` with `<UnsavedChangesDialog />`. All
 * listeners are removed on cleanup, so nothing leaks after unmount.
 */
export function useUnsavedChanges({ when }: { when: boolean }) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  // Resolves a paused router navigation: true keeps blocking (Stay),
  // false lets it continue (Leave).
  const [navResolver, setNavResolver] = useState<
    ((stay: boolean) => void) | null
  >(null)

  // The registered router, or null outside a RouterProvider (component
  // tests) — navigation blocking simply disengages without one.
  const router = useRouter({ warn: false }) as unknown as AnyRouter | null

  // Refresh / tab close: the one case where the native prompt must stay.
  useEffect(() => {
    if (!when) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [when])

  // In-app navigation (sidebar, breadcrumb, browser Back) pauses behind the
  // custom dialog; the native beforeunload path is handled above instead.
  useEffect(() => {
    if (!when || !router) return
    const unblock = router.history.block({
      // A truthy result blocks the navigation — the promise settles from
      // the dialog's Stay (block) / Leave (continue) buttons.
      blockerFn: () =>
        new Promise<boolean>((resolve) => {
          setNavResolver(() => (stay: boolean) => {
            setNavResolver(null)
            resolve(stay)
          })
        }),
      enableBeforeUnload: false,
    })
    return unblock
  }, [when, router])

  /** Runs `action` immediately when clean; otherwise asks first. */
  const guard = useCallback(
    (action: () => void) => {
      if (!when) {
        action()
        return
      }
      setPendingAction(() => action)
    },
    [when],
  )

  const open = pendingAction !== null || navResolver !== null

  const onStay = useCallback(() => {
    setPendingAction(null)
    navResolver?.(true)
  }, [navResolver])

  const onLeave = useCallback(() => {
    if (navResolver) {
      setPendingAction(null)
      navResolver(false)
      return
    }
    // Clear before running so a re-entrant guard starts from a clean slate.
    const action = pendingAction
    setPendingAction(null)
    action?.()
  }, [navResolver, pendingAction])

  const dialogProps: UnsavedChangesDialogProps = { open, onStay, onLeave }
  return { guard, dialogProps }
}
