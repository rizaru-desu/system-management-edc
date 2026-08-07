import { Check, Lock, Minus } from 'lucide-react'

import { BaseModal } from '#/components/ui/base-modal.tsx'
import { ROLES, SIDEBAR_MENU } from '#/features/console/index.ts'
import { cn } from '#/lib/utils.ts'
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  effectiveActions,
  rolePermissionsFor,
} from '../data/permissions.ts'
import type { RolePermissionMatrix } from '../data/permissions.ts'
import type { UserRecord } from '../data/users.ts'
import { RoleBadge } from './role-badge.tsx'

interface PermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRecord | null
  matrix: RolePermissionMatrix
}

/**
 * Read-only view of a user's effective access: the union of what their roles
 * grant in the role permission matrix (edited via RolePermissionsModal), so
 * both modals always agree.
 */
export function PermissionsModal({
  open,
  onOpenChange,
  user,
  matrix,
}: PermissionsModalProps) {
  if (!user) return null

  const grantingRoles = (path: string): Array<string> =>
    user.roles.filter(
      (role) => rolePermissionsFor(matrix, role, path)?.view ?? false,
    )

  const totalModules = SIDEBAR_MENU.reduce(
    (count, group) => count + group.submenus.length,
    0,
  )
  const grantedModules = SIDEBAR_MENU.reduce(
    (count, group) =>
      count +
      group.submenus.filter(
        (sub) => effectiveActions(user.roles, matrix, sub.path).view,
      ).length,
    0,
  )

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={<>Permissions — {user.name}</>}
      description="Effective module access from the assigned roles."
      footer={
        <p className="w-full text-left text-[11px] text-brand-900/50">
          <Lock className="mr-1 inline h-3 w-3 align-[-1px]" strokeWidth={2} />
          marks modules exposing masked or sensitive data. V/C/U/D = view,
          create, update, delete — edit them per role via “Role permissions”.
        </p>
      }
      contentClassName="py-1"
    >
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {user.roles.map((role) => (
          <RoleBadge key={role} role={role} />
        ))}
        <span className="ml-auto text-xs font-medium text-brand-500">
          {grantedModules} of {totalModules} modules
        </span>
      </div>

      <div>
        <div className="space-y-5">
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
                  {group.submenus.map((sub, index) => {
                    const actions = effectiveActions(
                      user.roles,
                      matrix,
                      sub.path,
                    )
                    const granted = grantingRoles(sub.path)
                    const hasAccess = actions.view
                    return (
                      <div
                        key={sub.path}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5',
                          index > 0 && 'border-t border-[#DDE0EC]',
                          !hasAccess && 'bg-[#F6F7F9]',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                            hasAccess
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-[#DDE0EC] text-[#0E2748]/40',
                          )}
                        >
                          {hasAccess ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            <Minus className="h-3 w-3" strokeWidth={3} />
                          )}
                        </span>
                        <span
                          className={cn(
                            'flex flex-1 items-center gap-1.5 text-sm',
                            hasAccess
                              ? 'font-medium text-[#0E2748]'
                              : 'text-[#0E2748]/40',
                          )}
                        >
                          {sub.title}
                          {sub.masked && (
                            <Lock
                              className="h-3 w-3 text-[#3F6FA8]"
                              strokeWidth={2}
                            />
                          )}
                        </span>

                        {/* Granted actions */}
                        {hasAccess && (
                          <span className="flex gap-1">
                            {PERMISSION_ACTIONS.map((action) => (
                              <span
                                key={action}
                                title={PERMISSION_ACTION_LABELS[action]}
                                className={cn(
                                  'flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold',
                                  actions[action]
                                    ? 'bg-[#3F6FA8]/15 text-[#3F6FA8]'
                                    : 'bg-[#F6F7F9] text-[#0E2748]/25',
                                )}
                              >
                                {PERMISSION_ACTION_LABELS[action].charAt(0)}
                              </span>
                            ))}
                          </span>
                        )}

                        <span className="flex flex-wrap justify-end gap-1">
                          {granted.map((role) => {
                            const meta = ROLES.find((item) => item.key === role)
                            return meta ? (
                              <span
                                key={role}
                                className="rounded bg-[#DDE0EC]/60 px-1.5 py-0.5 text-[10px] font-semibold text-[#3F6FA8]"
                              >
                                {meta.short}
                              </span>
                            ) : null
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </BaseModal>
  )
}
