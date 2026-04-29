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

export type Technician = {
  username: string;
  fullName: string;
  phone: string;
  email: string;
  department: string;
  active: boolean;
};

export type ServicePoint = {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string;
  status: "Online" | "Degraded" | "Offline";
  load: number;
  openJobs: number;
  technicianCount: number;
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

export const TECHNICIANS: Technician[] = [
  {
    username: "bagus.r",
    fullName: "Bagus Rahardian",
    phone: "+62 812-1010-2481",
    email: "bagus.rahardian@edc.io",
    department: "Field Service - Jakarta",
    active: true,
  },
  {
    username: "dewi.s",
    fullName: "Dewi Safitri",
    phone: "+62 813-7788-1042",
    email: "dewi.safitri@edc.io",
    department: "Field Service - Surabaya",
    active: true,
  },
  {
    username: "rian.p",
    fullName: "Rian Prasetyo",
    phone: "+62 811-5544-8021",
    email: "rian.prasetyo@edc.io",
    department: "Maintenance Support",
    active: true,
  },
  {
    username: "faiz.m",
    fullName: "Faiz Maulana",
    phone: "+62 857-9021-1145",
    email: "faiz.maulana@edc.io",
    department: "Repair Center",
    active: false,
  },
  {
    username: "anissa.k",
    fullName: "Anissa Kartika",
    phone: "+62 812-3344-7765",
    email: "anissa.kartika@edc.io",
    department: "Field Service - Bandung",
    active: true,
  },
  {
    username: "wahyu.n",
    fullName: "Wahyu Nugroho",
    phone: "+62 819-2211-3088",
    email: "wahyu.nugroho@edc.io",
    department: "Installation Team",
    active: true,
  },
  {
    username: "mira.l",
    fullName: "Mira Lestari",
    phone: "+62 818-7002-1450",
    email: "mira.lestari@edc.io",
    department: "Field Service - Medan",
    active: false,
  },
  {
    username: "yoga.a",
    fullName: "Yoga Adhitama",
    phone: "+62 812-9900-2317",
    email: "yoga.adhitama@edc.io",
    department: "Maintenance Support",
    active: true,
  },
  {
    username: "nabila.f",
    fullName: "Nabila Fitria",
    phone: "+62 856-4422-6712",
    email: "nabila.fitria@edc.io",
    department: "Field Service - Denpasar",
    active: true,
  },
  {
    username: "reza.h",
    fullName: "Reza Hidayat",
    phone: "+62 813-1901-5560",
    email: "reza.hidayat@edc.io",
    department: "Repair Center",
    active: true,
  },
  {
    username: "putri.d",
    fullName: "Putri Damayanti",
    phone: "+62 811-3900-7718",
    email: "putri.damayanti@edc.io",
    department: "Installation Team",
    active: false,
  },
  {
    username: "aditya.w",
    fullName: "Aditya Wibowo",
    phone: "+62 822-7019-3404",
    email: "aditya.wibowo@edc.io",
    department: "Field Service - Semarang",
    active: true,
  },
  {
    username: "sinta.p",
    fullName: "Sinta Permatasari",
    phone: "+62 857-1800-4922",
    email: "sinta.permatasari@edc.io",
    department: "Field Service - Makassar",
    active: true,
  },
  {
    username: "haikal.z",
    fullName: "Haikal Zain",
    phone: "+62 812-6088-3114",
    email: "haikal.zain@edc.io",
    department: "Maintenance Support",
    active: true,
  },
  {
    username: "livia.c",
    fullName: "Livia Cahyani",
    phone: "+62 821-4450-9033",
    email: "livia.cahyani@edc.io",
    department: "Field Service - Yogyakarta",
    active: false,
  },
  {
    username: "dimas.g",
    fullName: "Dimas Guntara",
    phone: "+62 812-5133-6790",
    email: "dimas.guntara@edc.io",
    department: "Repair Center",
    active: true,
  },
  {
    username: "eka.t",
    fullName: "Eka Triana",
    phone: "+62 878-2105-8871",
    email: "eka.triana@edc.io",
    department: "Field Service - Palembang",
    active: true,
  },
  {
    username: "arif.b",
    fullName: "Arif Budiman",
    phone: "+62 813-2280-1417",
    email: "arif.budiman@edc.io",
    department: "Installation Team",
    active: true,
  },
];

export const SERVICE_POINTS: ServicePoint[] = [
  {
    id: "sp-jkt-pusat",
    name: "SP Jakarta Pusat",
    city: "Jakarta",
    region: "Jabodetabek North",
    address: "Jl. Cideng Barat No. 18, Gambir",
    status: "Online",
    load: 78,
    openJobs: 24,
    technicianCount: 9,
  },
  {
    id: "sp-bandung",
    name: "SP Bandung",
    city: "Bandung",
    region: "West Java",
    address: "Jl. Asia Afrika No. 140, Lengkong",
    status: "Online",
    load: 54,
    openJobs: 16,
    technicianCount: 7,
  },
  {
    id: "sp-surabaya",
    name: "SP Surabaya",
    city: "Surabaya",
    region: "East Java",
    address: "Jl. Panglima Sudirman No. 71, Genteng",
    status: "Degraded",
    load: 92,
    openJobs: 31,
    technicianCount: 8,
  },
  {
    id: "sp-medan",
    name: "SP Medan",
    city: "Medan",
    region: "North Sumatra",
    address: "Jl. Diponegoro No. 22, Medan Baru",
    status: "Online",
    load: 38,
    openJobs: 11,
    technicianCount: 5,
  },
  {
    id: "sp-denpasar",
    name: "SP Denpasar",
    city: "Denpasar",
    region: "Bali Nusra",
    address: "Jl. Teuku Umar Barat No. 88, Denpasar",
    status: "Offline",
    load: 0,
    openJobs: 7,
    technicianCount: 3,
  },
  {
    id: "sp-semarang",
    name: "SP Semarang",
    city: "Semarang",
    region: "Central Java",
    address: "Jl. Pemuda No. 119, Sekayu",
    status: "Online",
    load: 61,
    openJobs: 18,
    technicianCount: 6,
  },
  {
    id: "sp-makassar",
    name: "SP Makassar",
    city: "Makassar",
    region: "Sulawesi",
    address: "Jl. A. P. Pettarani No. 45, Rappocini",
    status: "Online",
    load: 47,
    openJobs: 13,
    technicianCount: 4,
  },
];

export const TECHNICIAN_SERVICE_POINT_ASSIGNMENTS: Record<string, string> = {
  "bagus.r": "sp-jkt-pusat",
  "dewi.s": "sp-surabaya",
  "rian.p": "sp-jkt-pusat",
  "faiz.m": "sp-surabaya",
  "anissa.k": "sp-bandung",
  "wahyu.n": "sp-bandung",
  "mira.l": "sp-medan",
  "yoga.a": "sp-jkt-pusat",
  "nabila.f": "sp-denpasar",
  "reza.h": "sp-surabaya",
  "putri.d": "sp-bandung",
  "aditya.w": "sp-semarang",
  "sinta.p": "sp-makassar",
  "haikal.z": "sp-jkt-pusat",
  "livia.c": "sp-bandung",
  "dimas.g": "sp-surabaya",
  "eka.t": "sp-medan",
  "arif.b": "sp-semarang",
};

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
