import { Boxes, Building2, CreditCard, Settings, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Role catalogue + sidebar menu for the EDC.OS console shell, ported from
 * apps/web/sample (the sample's menu.json was missing, so the structure is
 * reconstructed from its Sidebar component and the EDC lifecycle modules).
 * The active role syncs from the session's `user.role` (see rolesFromUser);
 * menu visibility is cosmetic — the backend enforces real access.
 */
export const ROLES = [
  {
    key: 'System_Administrator',
    label: 'System Administrator',
    short: 'SysAdmin',
    color: 'bg-[#0E2748] text-white',
  },
  {
    key: 'Operations_Specialist',
    label: 'Operations Specialist',
    short: 'Operations',
    color: 'bg-[#3F6FA8] text-white',
  },
  {
    key: 'Inventory_Controller',
    label: 'Inventory Controller',
    short: 'Inventory',
    color: 'bg-emerald-600 text-white',
  },
  {
    key: 'Contract_Manager',
    label: 'Contract Manager',
    short: 'Contract',
    color: 'bg-amber-600 text-white',
  },
  {
    key: 'Field_Service_Engineer',
    label: 'Field Service Engineer',
    short: 'Field Engineer',
    color: 'bg-rose-600 text-white',
  },
] as const

export type RoleKey = (typeof ROLES)[number]['key']

const ROLE_KEYS = new Set<string>(ROLES.map((role) => role.key))

/**
 * Parses a Better Auth `user.role` value (role keys stored verbatim,
 * comma-separated for multi-role accounts — see the users feature) into the
 * console roles it grants. Keys outside the catalogue (e.g. the default
 * `user`) are dropped.
 */
export function rolesFromUser(role: string | null | undefined): Array<RoleKey> {
  return (role ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key): key is RoleKey => ROLE_KEYS.has(key))
}

export interface MenuSubItem {
  title: string
  path: string
  allowedRoles: Array<RoleKey>
  /** Renders a lock hint: the module exposes masked/sensitive data. */
  masked?: boolean
}

export interface MenuGroup {
  parent: string
  icon: LucideIcon
  submenus: Array<MenuSubItem>
}

const ALL: Array<RoleKey> = [
  'System_Administrator',
  'Operations_Specialist',
  'Inventory_Controller',
  'Contract_Manager',
  'Field_Service_Engineer',
]

export const SIDEBAR_MENU: Array<MenuGroup> = [
  {
    parent: 'Merchant Management',
    icon: Building2,
    submenus: [
      {
        title: 'Merchants',
        path: 'merchants',
        allowedRoles: [
          'System_Administrator',
          'Operations_Specialist',
          'Contract_Manager',
        ],
      },
      {
        title: 'Onboarding',
        path: 'merchant-onboarding',
        allowedRoles: ['System_Administrator', 'Operations_Specialist'],
      },
      {
        title: 'Contracts',
        path: 'contracts',
        allowedRoles: ['System_Administrator', 'Contract_Manager'],
        masked: true,
      },
    ],
  },
  {
    parent: 'Terminal Lifecycle',
    icon: CreditCard,
    submenus: [
      { title: 'Terminals', path: 'terminals', allowedRoles: ALL },
      {
        title: 'Deployments',
        path: 'deployments',
        allowedRoles: [
          'System_Administrator',
          'Operations_Specialist',
          'Field_Service_Engineer',
        ],
      },
      {
        title: 'Retrievals',
        path: 'retrievals',
        allowedRoles: [
          'System_Administrator',
          'Operations_Specialist',
          'Field_Service_Engineer',
        ],
      },
    ],
  },
  {
    parent: 'Inventory',
    icon: Boxes,
    submenus: [
      {
        title: 'Warehouses',
        path: 'warehouses',
        allowedRoles: ['System_Administrator', 'Inventory_Controller'],
      },
      {
        title: 'Stock Levels',
        path: 'stock',
        allowedRoles: [
          'System_Administrator',
          'Inventory_Controller',
          'Operations_Specialist',
        ],
      },
      {
        title: 'Stock Movements',
        path: 'stock-movements',
        allowedRoles: ['System_Administrator', 'Inventory_Controller'],
      },
    ],
  },
  {
    parent: 'Service Operations',
    icon: Wrench,
    submenus: [
      {
        title: 'Job Orders',
        path: 'job-orders',
        allowedRoles: [
          'System_Administrator',
          'Operations_Specialist',
          'Field_Service_Engineer',
        ],
      },
      {
        title: 'Deliveries',
        path: 'deliveries',
        allowedRoles: ['System_Administrator', 'Operations_Specialist'],
      },
      {
        title: 'Field Engineers',
        path: 'engineers',
        allowedRoles: ['System_Administrator', 'Operations_Specialist'],
      },
    ],
  },
  {
    parent: 'Administration',
    icon: Settings,
    submenus: [
      {
        title: 'Users & Roles',
        path: 'users',
        allowedRoles: ['System_Administrator'],
        masked: true,
      },
      {
        title: 'Service Points',
        path: 'service-points',
        allowedRoles: ['System_Administrator', 'Operations_Specialist'],
      },
      {
        title: 'Audit Logs',
        path: 'audit-logs',
        allowedRoles: ['System_Administrator'],
        masked: true,
      },
    ],
  },
]

/** Groups/submenus visible to a role; groups with nothing visible are dropped. */
export function filterMenuByRole(role: RoleKey): Array<MenuGroup> {
  return SIDEBAR_MENU.map((group) => ({
    ...group,
    submenus: group.submenus.filter((sub) => sub.allowedRoles.includes(role)),
  })).filter((group) => group.submenus.length > 0)
}

/** Finds the group + submenu owning a console path (e.g. "terminals"). */
export function findMenuEntry(
  path: string,
): { group: MenuGroup; sub: MenuSubItem } | null {
  for (const group of SIDEBAR_MENU) {
    const sub = group.submenus.find((item) => item.path === path)
    if (sub) return { group, sub }
  }
  return null
}
