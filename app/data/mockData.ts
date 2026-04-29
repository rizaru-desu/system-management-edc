import {
  LuArchive,
  LuBuilding2,
  LuClipboardList,
  LuCreditCard,
  LuFileText,
  LuHardDrive,
  LuMap,
  LuPackage,
  LuSettings,
  LuStore,
  LuTruck,
  LuUsers,
  LuWarehouse,
  LuWrench,
} from "react-icons/lu";

import type { IconType } from "react-icons";

export type RoleKey =
  | "System_Administrator"
  | "Operations_Specialist"
  | "Inventory_Controller"
  | "Contract_Manager"
  | "Field_Service_Engineer";

export type Role = {
  key: RoleKey;
  label: string;
  short: string;
  color: string;
};

export type User = {
  email: string;
  password: string;
  name: string;
  initials: string;
  role: RoleKey;
  department: string;
  employeeId: string;
  lastLogin: string;
  location: string;
};

export type KpiItem = {
  label: string;
  value: number;
  delta: string;
  trend: "up" | "down";
  icon: IconType;
};

export type ActivityPoint = {
  day: string;
  deployed: number;
  retrieved: number;
};

export type ServicePointStatus = {
  name: string;
  status: "Online" | "Degraded" | "Offline";
  load: number;
};

export type RecentJob = {
  id: string;
  merchant: string;
  type: string;
  engineer: string;
  status: "In Progress" | "Pending" | "Completed";
  sla: "On Track" | "At Risk" | "Breached";
  updated: string;
};

export type SidebarSubmenu = {
  title: string;
  path: string;
  allowedRoles: RoleKey[];
  requiresDataMasking?: boolean;
};

export type SidebarGroup = {
  parent: string;
  icon: IconType;
  allowedRoles: RoleKey[];
  submenus: SidebarSubmenu[];
};

const allRoles: RoleKey[] = [
  "System_Administrator",
  "Operations_Specialist",
  "Inventory_Controller",
  "Contract_Manager",
  "Field_Service_Engineer",
];

export const ROLES: Role[] = [
  {
    key: "System_Administrator",
    label: "System Administrator",
    short: "SysAdmin",
    color: "bg-[#0E2748] text-white",
  },
  {
    key: "Operations_Specialist",
    label: "Operations Specialist",
    short: "Operations",
    color: "bg-[#3F6FA8] text-white",
  },
  {
    key: "Inventory_Controller",
    label: "Inventory Controller",
    short: "Inventory",
    color: "bg-emerald-600 text-white",
  },
  {
    key: "Contract_Manager",
    label: "Contract Manager",
    short: "Contract",
    color: "bg-amber-600 text-white",
  },
  {
    key: "Field_Service_Engineer",
    label: "Field Service Engineer",
    short: "Field Engineer",
    color: "bg-rose-600 text-white",
  },
];

export const MOCK_USERS: User[] = [
  {
    email: "admin@edc.io",
    password: "admin123",
    name: "Hadyan Pratama",
    initials: "HP",
    role: "System_Administrator",
    department: "IT - Platform",
    employeeId: "EDC-0001",
    lastLogin: "Today, 09:14 AM",
    location: "Jakarta HQ",
  },
  {
    email: "ops@edc.io",
    password: "ops123",
    name: "Sari Wulandari",
    initials: "SW",
    role: "Operations_Specialist",
    department: "Operations",
    employeeId: "EDC-0142",
    lastLogin: "Yesterday, 17:22 PM",
    location: "Surabaya Branch",
  },
];

export const KPI_DATA: KpiItem[] = [
  {
    label: "Total Terminals",
    value: 12847,
    delta: "+4.2%",
    trend: "up",
    icon: LuCreditCard,
  },
  {
    label: "Active Merchants",
    value: 3214,
    delta: "+1.8%",
    trend: "up",
    icon: LuBuilding2,
  },
  {
    label: "Open Job Orders",
    value: 184,
    delta: "-6.1%",
    trend: "down",
    icon: LuClipboardList,
  },
  {
    label: "Pending Deliveries",
    value: 47,
    delta: "+12.4%",
    trend: "up",
    icon: LuTruck,
  },
];

export const ACTIVITY_DATA: ActivityPoint[] = [
  { day: "Mon", deployed: 42, retrieved: 18 },
  { day: "Tue", deployed: 51, retrieved: 22 },
  { day: "Wed", deployed: 38, retrieved: 27 },
  { day: "Thu", deployed: 64, retrieved: 19 },
  { day: "Fri", deployed: 73, retrieved: 31 },
  { day: "Sat", deployed: 29, retrieved: 14 },
  { day: "Sun", deployed: 21, retrieved: 9 },
];

export const SERVICE_POINT_STATUS: ServicePointStatus[] = [
  { name: "SP Jakarta Pusat", status: "Online", load: 78 },
  { name: "SP Bandung", status: "Online", load: 54 },
  { name: "SP Surabaya", status: "Degraded", load: 92 },
  { name: "SP Medan", status: "Online", load: 38 },
  { name: "SP Denpasar", status: "Offline", load: 0 },
];

export const RECENT_JOBS: RecentJob[] = [
  {
    id: "JO-24871",
    merchant: "Indomaret Cikini 04",
    type: "Installation",
    engineer: "Bagus R.",
    status: "In Progress",
    sla: "On Track",
    updated: "12 min ago",
  },
  {
    id: "JO-24870",
    merchant: "Alfamart Kuningan 11",
    type: "Replacement",
    engineer: "Dewi S.",
    status: "Pending",
    sla: "At Risk",
    updated: "34 min ago",
  },
  {
    id: "JO-24868",
    merchant: "BCA Sudirman",
    type: "Maintenance",
    engineer: "Rian P.",
    status: "Completed",
    sla: "On Track",
    updated: "1 h ago",
  },
  {
    id: "JO-24866",
    merchant: "Pertamina Senayan",
    type: "Repair",
    engineer: "Faiz M.",
    status: "In Progress",
    sla: "Breached",
    updated: "2 h ago",
  },
  {
    id: "JO-24862",
    merchant: "Hypermart Bandung",
    type: "Installation",
    engineer: "Anissa K.",
    status: "Completed",
    sla: "On Track",
    updated: "3 h ago",
  },
];

export const SIDEBAR_MENU: SidebarGroup[] = [
  {
    parent: "Terminal Management",
    icon: LuHardDrive,
    allowedRoles: allRoles,
    submenus: [
      {
        title: "Terminal Registry",
        path: "terminals/registry",
        allowedRoles: allRoles,
      },
      {
        title: "Deployment Tracker",
        path: "terminals/deployments",
        allowedRoles: ["System_Administrator", "Operations_Specialist"],
      },
      {
        title: "Maintenance Queue",
        path: "terminals/maintenance",
        allowedRoles: ["System_Administrator", "Field_Service_Engineer"],
      },
    ],
  },
  {
    parent: "Merchants",
    icon: LuStore,
    allowedRoles: [
      "System_Administrator",
      "Operations_Specialist",
      "Contract_Manager",
      "Field_Service_Engineer",
    ],
    submenus: [
      {
        title: "Merchant Directory",
        path: "merchants/directory",
        allowedRoles: [
          "System_Administrator",
          "Operations_Specialist",
          "Contract_Manager",
          "Field_Service_Engineer",
        ],
        requiresDataMasking: true,
      },
      {
        title: "Contract Renewals",
        path: "merchants/contracts",
        allowedRoles: ["System_Administrator", "Contract_Manager"],
      },
    ],
  },
  {
    parent: "Inventory",
    icon: LuWarehouse,
    allowedRoles: [
      "System_Administrator",
      "Inventory_Controller",
      "Operations_Specialist",
    ],
    submenus: [
      {
        title: "Warehouse Stock",
        path: "inventory/stock",
        allowedRoles: [
          "System_Administrator",
          "Inventory_Controller",
          "Operations_Specialist",
        ],
      },
      {
        title: "Inbound Shipments",
        path: "inventory/inbound",
        allowedRoles: ["System_Administrator", "Inventory_Controller"],
      },
      {
        title: "Asset Archive",
        path: "inventory/archive",
        allowedRoles: ["System_Administrator", "Inventory_Controller"],
      },
    ],
  },
  {
    parent: "Field Operations",
    icon: LuMap,
    allowedRoles: [
      "System_Administrator",
      "Operations_Specialist",
      "Field_Service_Engineer",
    ],
    submenus: [
      {
        title: "Job Orders",
        path: "field/job-orders",
        allowedRoles: [
          "System_Administrator",
          "Operations_Specialist",
          "Field_Service_Engineer",
        ],
      },
      {
        title: "Engineer Dispatch",
        path: "field/dispatch",
        allowedRoles: ["System_Administrator", "Operations_Specialist"],
      },
      {
        title: "Service Reports",
        path: "field/reports",
        allowedRoles: ["System_Administrator", "Field_Service_Engineer"],
      },
      {
        title: "Work Clusters",
        path: "field/clusters",
        allowedRoles: ["System_Administrator", "Field_Service_Engineer"],
      },
      {
        title: "Technician Directory",
        path: "field/technicians",
        allowedRoles: ["System_Administrator", "Field_Service_Engineer"],
      },
    ],
  },
  {
    parent: "Administration",
    icon: LuSettings,
    allowedRoles: ["System_Administrator"],
    submenus: [
      {
        title: "Users & Roles",
        path: "admin/users",
        allowedRoles: ["System_Administrator"],
      },
      {
        title: "Audit Log",
        path: "admin/audit-log",
        allowedRoles: ["System_Administrator"],
        requiresDataMasking: true,
      },
      {
        title: "System Settings",
        path: "admin/settings",
        allowedRoles: ["System_Administrator"],
      },
    ],
  },
];

export const PLACEHOLDER_ICONS = [
  LuArchive,
  LuFileText,
  LuPackage,
  LuUsers,
  LuWrench,
];
