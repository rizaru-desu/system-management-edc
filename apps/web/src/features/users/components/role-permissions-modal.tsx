import { useEffect, useState } from 'react'
import { Check, Lock, RotateCcw, ShieldCheck } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { ROLES, SIDEBAR_MENU } from '#/features/console/index.ts'
import type { RoleKey } from '#/features/console/index.ts'
import { cn } from '#/lib/utils.ts'
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  SYSTEM_ADMIN,
  seedRoleDefaults,
} from '../data/permissions.ts'
import type {
  PermissionAction,
  RolePermissionMatrix,
} from '../data/permissions.ts'

interface RolePermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matrix: RolePermissionMatrix
  onSave: (matrix: RolePermissionMatrix) => void
}

/**
 * Editable role × module × action matrix. Edits live on a draft copy and are
 * only committed on "Save changes"; System Administrator is pinned to full
 * access and cannot be edited. Client-side state until the backend role
 * model lands.
 */
export function RolePermissionsModal({
  open,
  onOpenChange,
  matrix,
  onSave,
}: RolePermissionsModalProps) {
  const [draft, setDraft] = useState<RolePermissionMatrix>(matrix)
  const [selectedRole, setSelectedRole] = useState<RoleKey>(SYSTEM_ADMIN)

  // Fresh draft every time the modal opens so cancelled edits never leak.
  useEffect(() => {
    if (open) {
      setDraft(structuredClone(matrix))
      setSelectedRole(SYSTEM_ADMIN)
    }
  }, [open, matrix])

  const isLocked = selectedRole === SYSTEM_ADMIN
  const rolePerms = draft[selectedRole]

  const toggle = (path: string, action: PermissionAction) => {
    if (isLocked) return
    setDraft((previous) => {
      const current = previous[selectedRole][path]
      const next = { ...current, [action]: !current[action] }
      if (action === 'view' && current.view) {
        // Losing view revokes every action on the module.
        next.create = false
        next.update = false
        next.delete = false
      } else if (action !== 'view' && !current[action]) {
        // Granting an action implies being able to see the module.
        next.view = true
      }
      return {
        ...previous,
        [selectedRole]: { ...previous[selectedRole], [path]: next },
      }
    })
  }

  const resetRole = () => {
    if (isLocked) return
    setDraft((previous) => ({
      ...previous,
      [selectedRole]: seedRoleDefaults(selectedRole),
    }))
  }

  const handleSave = () => {
    onSave(draft)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light max-h-[88vh] gap-0 overflow-hidden border-[#DDE0EC] bg-white p-0 text-[#0E2748] sm:max-w-3xl">
        <DialogHeader className="border-b border-[#DDE0EC] p-6 pb-4">
          <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
            Role permissions
          </DialogTitle>
          <DialogDescription className="text-[#0E2748]/60">
            Configure what each role can do per module. Granting an action
            implies view; revoking view clears the whole row.
          </DialogDescription>

          {/* Role selector */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {ROLES.map((role) => {
              const active = role.key === selectedRole
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedRole(role.key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-[#3F6FA8] bg-[#3F6FA8]/10 text-[#0E2748]'
                      : 'border-[#DDE0EC] bg-white text-[#0E2748]/60 hover:border-[#3F6FA8]/60 hover:text-[#0E2748]',
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      role.color.split(' ')[0],
                    )}
                  />
                  {role.short}
                  {role.key === SYSTEM_ADMIN && (
                    <Lock className="h-3 w-3 opacity-50" strokeWidth={2} />
                  )}
                </button>
              )
            })}
          </div>

          {isLocked && (
            <p className="mt-1 flex items-start gap-2 rounded-lg bg-[#3F6FA8]/10 px-3 py-2 text-xs text-[#0E2748]/70">
              <ShieldCheck
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3F6FA8]"
                strokeWidth={2}
              />
              System Administrator always has full access to every module and
              cannot be edited.
            </p>
          )}
        </DialogHeader>

        {/* Matrix */}
        <div className="max-h-[48vh] overflow-x-auto overflow-y-auto p-6 pt-4">
          <div className="min-w-[480px] space-y-5">
            {SIDEBAR_MENU.map((group) => {
              const Icon = group.icon
              return (
                <div key={group.parent}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0E2748] text-white">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <p className="text-sm font-semibold text-[#0E2748]">
                      {group.parent}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#DDE0EC]">
                    {/* Column header */}
                    <div className="grid grid-cols-[1fr_repeat(4,64px)] items-center gap-2 border-b border-[#DDE0EC] bg-[#F6F7F9] px-4 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/50">
                        Module
                      </span>
                      {PERMISSION_ACTIONS.map((action) => (
                        <span
                          key={action}
                          className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#0E2748]/50"
                        >
                          {PERMISSION_ACTION_LABELS[action]}
                        </span>
                      ))}
                    </div>

                    {group.submenus.map((sub, index) => {
                      const perms = rolePerms[sub.path]
                      return (
                        <div
                          key={sub.path}
                          className={cn(
                            'grid grid-cols-[1fr_repeat(4,64px)] items-center gap-2 px-4 py-2.5',
                            index > 0 && 'border-t border-[#DDE0EC]',
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-[#0E2748]">
                            {sub.title}
                            {sub.masked && (
                              <Lock
                                className="h-3 w-3 text-[#3F6FA8]"
                                strokeWidth={2}
                              />
                            )}
                          </span>
                          {PERMISSION_ACTIONS.map((action) => {
                            const granted = perms[action]
                            return (
                              <span
                                key={action}
                                className="flex justify-center"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggle(sub.path, action)}
                                  disabled={isLocked}
                                  aria-pressed={granted}
                                  aria-label={`${PERMISSION_ACTION_LABELS[action]} ${sub.title}`}
                                  className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                                    granted
                                      ? 'border-[#3F6FA8] bg-[#3F6FA8] text-white'
                                      : 'border-[#DDE0EC] bg-white hover:border-[#3F6FA8]/60',
                                    isLocked && 'cursor-not-allowed opacity-60',
                                  )}
                                >
                                  {granted && (
                                    <Check
                                      className="h-3 w-3"
                                      strokeWidth={3}
                                    />
                                  )}
                                </button>
                              </span>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-[#DDE0EC] bg-[#F6F7F9] px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={resetRole}
            disabled={isLocked}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Reset role to defaults
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
