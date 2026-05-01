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
  code: string;
  name: string;
  city: string;
  region: string;
  address: string;
  status: "Online" | "Degraded" | "Offline";
  cluster: string;
  warehouseId: string;
  load: number;
  openJobs: number;
  technicianCount: number;
  clusterTechnicianCount: number;
  unmappedTechnicianCount: number;
  terminalBuffer: number;
  sparePartBuffer: number;
};

export type WorkClusterStatus = "Healthy" | "Watch" | "Critical";

export type WorkCluster = {
  id: string;
  name: string;
  region: string;
  status: WorkClusterStatus;
  leaderUsername?: string;
  slaScore: number;
  load: number;
  riskIndicator: string;
  servicePointIds: string[];
};

export type Merchant = {
  id: string;
  mid: string;
  name: string;
  brandName: string;
  segment: "Retail" | "Banking" | "Fuel" | "Grocery" | "Hospitality";
  status: "Active" | "Inactive" | "Under Review";
  region: string;
  city: string;
  address: string;
  servicePointId: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  activeTerminalCount: number;
};

export type ContractAccountStatus = "Active" | "Inactive";
export type ContractAccountType = "Corporate" | "Branch" | "Aggregator";
export type ContractPaymentTerm = "Due on Receipt" | "Net 14" | "Net 30" | "Net 45";
export type ContractBillingCycle = "Monthly" | "Quarterly" | "Annually";

export type ContractAccount = {
  id: string;
  accountNumber: string;
  accountName: string;
  merchantId: string;
  accountType: ContractAccountType;
  status: ContractAccountStatus;
  billingName: string;
  billingAddress: string;
  billingCity: string;
  billingRegion: string;
  taxId: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  defaultServicePointId: string;
  paymentTerm: ContractPaymentTerm;
  billingCycle: ContractBillingCycle;
  contractOwner: string;
  effectiveDate: string;
};

export type ProjectStatus = "Active" | "Inactive";
export type ProjectContractLineStatus = "Linked" | "Ready" | "Not Linked";

export type Project = {
  id: string;
  name: string;
  code: string;
  description: string;
  status: ProjectStatus;
  contractLineNumber: string;
  contractLineName: string;
  contractLineStatus: ProjectContractLineStatus;
};

export type ContractLineStatus = "Active" | "Inactive";
export type ContractLineDocumentStatus =
  | "Draft"
  | "Document Verification"
  | "Writing Hardcopy"
  | "Hardcopy Sent"
  | "Signed"
  | "Archived";

export type ContractLine = {
  id: string;
  lineNumber: string;
  lineName: string;
  vendorName: string;
  accountId: string;
  projectId: string;
  serviceItem: string;
  startDate: string;
  endDate: string;
  status: ContractLineStatus;
  documentStatus: ContractLineDocumentStatus;
  notes: string;
};

export type Terminal = {
  id: string;
  tid: string;
  merchantId: string;
  servicePointId: string;
  model: string;
  status: "Active" | "Problem" | "Maintenance";
  lastSignal: string;
};

export type WarehouseStatus = "Active" | "Maintenance" | "Full" | "Inactive";
export type WarehouseType = "Central" | "Regional" | "Spare Pool" | "Repair Hub";

export type Warehouse = {
  id: string;
  code: string;
  name: string;
  status: WarehouseStatus;
  type: WarehouseType;
  region: string;
  city: string;
  address: string;
  managerName: string;
  contactPhone: string;
  capacityTotal: number;
  capacityUsed: number;
  terminalStock: number;
  sparePartStock: number;
  inboundPending: number;
  outboundPending: number;
  lastAuditAt: string;
  serviceArea: string;
};

export type InboundShipmentStatus =
  | "Expected"
  | "Picked Up"
  | "In Transit"
  | "Arrived"
  | "Receiving"
  | "Discrepancy"
  | "Quarantine"
  | "Completed";

export type InboundQcStatus = "Pending" | "Passed" | "Review" | "Failed";
export type InboundStockDisposition =
  | "Available / Stock Titipan"
  | "Discrepancy Review"
  | "Quarantine Hold"
  | "Pending Receiving";

export type InboundShipmentLine = {
  sku: string;
  itemName: string;
  expectedQty: number;
  receivedQty: number;
  acceptedQty: number;
  discrepancyQty: number;
  serialScanned: number;
  serialTotal: number;
};

export type InboundShipmentDocument = {
  type: "ASN" | "Pickup Photo" | "Handover" | "Delivery Note" | "GRN";
  ref: string;
  status: "Ready" | "Captured" | "Pending";
  capturedAt?: string;
};

export type InboundShipmentEvent = {
  label: string;
  status: "Done" | "Active" | "Pending" | "Issue";
  timestamp?: string;
  owner?: string;
};

export type InboundShipment = {
  id: string;
  asnNumber: string;
  clientName: string;
  origin: string;
  destinationWarehouseId: string;
  pickupTeam: string;
  supervisor: string;
  status: InboundShipmentStatus;
  expectedAt: string;
  pickupAt?: string;
  arrivedAt?: string;
  closedAt?: string;
  expectedQty: number;
  receivedQty: number;
  discrepancyQty: number;
  quarantineQty: number;
  serialScanned: number;
  qcStatus: InboundQcStatus;
  grnNumber?: string;
  stockDisposition: InboundStockDisposition;
  documents: InboundShipmentDocument[];
  lines: InboundShipmentLine[];
  timeline: InboundShipmentEvent[];
};

export type ProductCategory = "Terminal" | "Peripheral" | "Spare Part";
export type ProductStatus = "Active" | "Phasing Out" | "Inactive";
export type AssetTrackingType = "Serialized" | "Batch" | "Quantity";

export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  model: string;
  category: ProductCategory;
  trackingType: AssetTrackingType;
  status: ProductStatus;
  unit: string;
  warrantyMonths: number;
  minStock: number;
  description: string;
  compatibleAccessories: string[];
};

export type InventoryItemStatus =
  | "Available / Stock Titipan"
  | "Reserved"
  | "Picked / Packed"
  | "In Delivery"
  | "Installed"
  | "Returned"
  | "Quarantine"
  | "Discrepancy"
  | "In Repair"
  | "Retired";

export type InventoryCondition = "New" | "Good" | "Needs QC" | "Damaged";

export type InventoryItem = {
  id: string;
  serialNumber: string;
  productId: string;
  warehouseId: string;
  inboundShipmentId?: string;
  status: InventoryItemStatus;
  condition: InventoryCondition;
  ownerClient: string;
  binLocation: string;
  stockQuantity?: number;
  receivedAt: string;
  lastMovementAt: string;
  firmwareVersion?: string;
  warrantyUntil?: string;
  notes: string;
  movementHistory: {
    label: string;
    timestamp: string;
    location: string;
    owner: string;
    sourceDocument?: string;
    note?: string;
  }[];
};

export type DeliveryOrderStatus =
  | "Requested"
  | "Reserved"
  | "Picked / Packed"
  | "In Delivery"
  | "Delivered"
  | "Installed / Assigned"
  | "Exception"
  | "Cancelled";

export type DeliveryOrderPriority = "Low" | "Normal" | "High" | "Critical";

export type AssetDocumentType =
  | "ASN"
  | "GRN"
  | "Delivery Note"
  | "BAST"
  | "Pickup Photo"
  | "Install Proof"
  | "Return Note";

export type AssetDocument = {
  type: AssetDocumentType;
  ref: string;
  status: "Ready" | "Captured" | "Pending" | "Signed";
  capturedAt?: string;
};

export type DeliveryLine = {
  productId: string;
  requestedQty: number;
  allocatedQty: number;
  deliveredQty: number;
  trackingType: AssetTrackingType;
  serialNumbers?: string[];
  sourceWarehouseId: string;
};

export type DeliveryOrderEvent = {
  label: string;
  status: "Done" | "Active" | "Pending" | "Issue";
  timestamp?: string;
  owner?: string;
};

export type DeliveryOrder = {
  id: string;
  orderNumber: string;
  requestType: "Merchant Install" | "Replacement" | "Service Point Replenishment";
  requester: string;
  destinationName: string;
  destinationType: "Merchant" | "Service Point" | "Technician";
  destinationAddress: string;
  sourceWarehouseId: string;
  assignedTeam: string;
  supervisor: string;
  priority: DeliveryOrderPriority;
  status: DeliveryOrderStatus;
  requestedAt: string;
  targetAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  requestedQty: number;
  allocatedQty: number;
  deliveredQty: number;
  proofStatus: "Pending" | "Partial" | "Complete" | "Issue";
  documents: AssetDocument[];
  lines: DeliveryLine[];
  timeline: DeliveryOrderEvent[];
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
  {
    email: "inventory@edc.io",
    password: "inventory123",
    name: "Bima Santoso",
    initials: "BS",
    role: "Inventory_Controller",
    department: "Inventory Control",
    employeeId: "EDC-0237",
    lastLogin: "Today, 08:31 AM",
    location: "Jakarta Warehouse",
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
    code: "SP-JKT-01",
    name: "SP Jakarta Pusat",
    city: "Jakarta",
    region: "Jabodetabek North",
    address: "Jl. Cideng Barat No. 18, Gambir",
    status: "Online",
    cluster: "Cluster Metro Alpha",
    warehouseId: "wh-jkt-central",
    load: 78,
    openJobs: 24,
    technicianCount: 9,
    clusterTechnicianCount: 7,
    unmappedTechnicianCount: 2,
    terminalBuffer: 96,
    sparePartBuffer: 142,
  },
  {
    id: "sp-bandung",
    code: "SP-BDG-02",
    name: "SP Bandung",
    city: "Bandung",
    region: "West Java",
    address: "Jl. Asia Afrika No. 140, Lengkong",
    status: "Online",
    cluster: "Cluster Priangan",
    warehouseId: "wh-bdg-regional",
    load: 54,
    openJobs: 16,
    technicianCount: 7,
    clusterTechnicianCount: 6,
    unmappedTechnicianCount: 1,
    terminalBuffer: 72,
    sparePartBuffer: 108,
  },
  {
    id: "sp-surabaya",
    code: "SP-SBY-03",
    name: "SP Surabaya",
    city: "Surabaya",
    region: "East Java",
    address: "Jl. Panglima Sudirman No. 71, Genteng",
    status: "Degraded",
    cluster: "Cluster East Gateway",
    warehouseId: "wh-sby-repair",
    load: 92,
    openJobs: 31,
    technicianCount: 8,
    clusterTechnicianCount: 5,
    unmappedTechnicianCount: 3,
    terminalBuffer: 44,
    sparePartBuffer: 86,
  },
  {
    id: "sp-medan",
    code: "SP-MDN-04",
    name: "SP Medan",
    city: "Medan",
    region: "North Sumatra",
    address: "Jl. Diponegoro No. 22, Medan Baru",
    status: "Online",
    cluster: "Cluster Sumatra North",
    warehouseId: "wh-mdn-spare",
    load: 38,
    openJobs: 11,
    technicianCount: 5,
    clusterTechnicianCount: 4,
    unmappedTechnicianCount: 1,
    terminalBuffer: 58,
    sparePartBuffer: 77,
  },
  {
    id: "sp-denpasar",
    code: "SP-DPS-05",
    name: "SP Denpasar",
    city: "Denpasar",
    region: "Bali Nusra",
    address: "Jl. Teuku Umar Barat No. 88, Denpasar",
    status: "Offline",
    cluster: "Cluster Bali Nusra",
    warehouseId: "wh-dps-regional",
    load: 0,
    openJobs: 7,
    technicianCount: 3,
    clusterTechnicianCount: 1,
    unmappedTechnicianCount: 2,
    terminalBuffer: 12,
    sparePartBuffer: 28,
  },
  {
    id: "sp-semarang",
    code: "SP-SMG-06",
    name: "SP Semarang",
    city: "Semarang",
    region: "Central Java",
    address: "Jl. Pemuda No. 119, Sekayu",
    status: "Online",
    cluster: "Cluster Central Corridor",
    warehouseId: "wh-smg-regional",
    load: 61,
    openJobs: 18,
    technicianCount: 6,
    clusterTechnicianCount: 5,
    unmappedTechnicianCount: 1,
    terminalBuffer: 64,
    sparePartBuffer: 93,
  },
  {
    id: "sp-makassar",
    code: "SP-MKS-07",
    name: "SP Makassar",
    city: "Makassar",
    region: "Sulawesi",
    address: "Jl. A. P. Pettarani No. 45, Rappocini",
    status: "Online",
    cluster: "Cluster Sulawesi South",
    warehouseId: "wh-mks-regional",
    load: 47,
    openJobs: 13,
    technicianCount: 4,
    clusterTechnicianCount: 3,
    unmappedTechnicianCount: 1,
    terminalBuffer: 51,
    sparePartBuffer: 69,
  },
];

export const WORK_CLUSTERS: WorkCluster[] = [
  {
    id: "cluster-metro-alpha",
    name: "Cluster Metro Alpha",
    region: "Jabodetabek North",
    status: "Watch",
    leaderUsername: "bagus.r",
    slaScore: 91,
    load: 78,
    riskIndicator: "High job density around central business districts",
    servicePointIds: ["sp-jkt-pusat"],
  },
  {
    id: "cluster-priangan",
    name: "Cluster Priangan",
    region: "West Java",
    status: "Healthy",
    leaderUsername: "anissa.k",
    slaScore: 96,
    load: 54,
    riskIndicator: "Balanced field coverage",
    servicePointIds: ["sp-bandung"],
  },
  {
    id: "cluster-east-gateway",
    name: "Cluster East Gateway",
    region: "East Java",
    status: "Critical",
    leaderUsername: "dewi.s",
    slaScore: 82,
    load: 92,
    riskIndicator: "Service point degraded with breached repair queue",
    servicePointIds: ["sp-surabaya"],
  },
  {
    id: "cluster-sumatra-north",
    name: "Cluster Sumatra North",
    region: "North Sumatra",
    status: "Healthy",
    leaderUsername: "eka.t",
    slaScore: 97,
    load: 38,
    riskIndicator: "Low workload with available field capacity",
    servicePointIds: ["sp-medan"],
  },
  {
    id: "cluster-bali-nusra",
    name: "Cluster Bali Nusra",
    region: "Bali Nusra",
    status: "Critical",
    leaderUsername: "nabila.f",
    slaScore: 76,
    load: 0,
    riskIndicator: "Offline service point blocks dispatch coverage",
    servicePointIds: ["sp-denpasar"],
  },
  {
    id: "cluster-central-corridor",
    name: "Cluster Central Corridor",
    region: "Central Java",
    status: "Healthy",
    leaderUsername: "aditya.w",
    slaScore: 94,
    load: 61,
    riskIndicator: "Stable preventive maintenance flow",
    servicePointIds: ["sp-semarang"],
  },
  {
    id: "cluster-sulawesi-south",
    name: "Cluster Sulawesi South",
    region: "Sulawesi",
    status: "Healthy",
    leaderUsername: "sinta.p",
    slaScore: 95,
    load: 47,
    riskIndicator: "Normal merchant support volume",
    servicePointIds: ["sp-makassar"],
  },
];

export const MERCHANTS: Merchant[] = [
  {
    id: "m-indomaret-cikini",
    mid: "MID-2026-0001",
    name: "Indomaret Cikini 04",
    brandName: "Indomaret",
    segment: "Grocery",
    status: "Active",
    region: "Jabodetabek North",
    city: "Jakarta",
    address: "Jl. Cikini Raya No. 44, Menteng",
    servicePointId: "sp-jkt-pusat",
    picName: "Rendra Saputra",
    picPhone: "+62 812-1188-4104",
    picEmail: "rendra.saputra@indomaret.example",
    activeTerminalCount: 5,
  },
  {
    id: "m-alfamart-kuningan",
    mid: "MID-2026-0002",
    name: "Alfamart Kuningan 11",
    brandName: "Alfamart",
    segment: "Grocery",
    status: "Active",
    region: "Jabodetabek North",
    city: "Jakarta",
    address: "Jl. HR Rasuna Said Kav. 11, Kuningan",
    servicePointId: "sp-jkt-pusat",
    picName: "Maya Soraya",
    picPhone: "+62 813-2290-7711",
    picEmail: "maya.soraya@alfamart.example",
    activeTerminalCount: 4,
  },
  {
    id: "m-bca-sudirman",
    mid: "MID-2026-0003",
    name: "BCA Sudirman",
    brandName: "BCA",
    segment: "Banking",
    status: "Active",
    region: "Jabodetabek North",
    city: "Jakarta",
    address: "Jl. Jenderal Sudirman Kav. 22",
    servicePointId: "sp-jkt-pusat",
    picName: "Niko Prasetya",
    picPhone: "+62 811-9040-2201",
    picEmail: "niko.prasetya@bca.example",
    activeTerminalCount: 8,
  },
  {
    id: "m-hypermart-bandung",
    mid: "MID-2026-0004",
    name: "Hypermart Bandung",
    brandName: "Hypermart",
    segment: "Retail",
    status: "Active",
    region: "West Java",
    city: "Bandung",
    address: "Jl. Merdeka No. 56, Bandung Wetan",
    servicePointId: "sp-bandung",
    picName: "Dita Rahmani",
    picPhone: "+62 812-7780-1604",
    picEmail: "dita.rahmani@hypermart.example",
    activeTerminalCount: 6,
  },
  {
    id: "m-kopi-braga",
    mid: "MID-2026-0005",
    name: "Kopi Braga Reserve",
    brandName: "Kopi Braga",
    segment: "Hospitality",
    status: "Under Review",
    region: "West Java",
    city: "Bandung",
    address: "Jl. Braga No. 21, Sumur Bandung",
    servicePointId: "sp-bandung",
    picName: "Arman Wicaksono",
    picPhone: "+62 857-3100-9244",
    picEmail: "arman@kopibraga.example",
    activeTerminalCount: 3,
  },
  {
    id: "m-tunjungan-plaza",
    mid: "MID-2026-0006",
    name: "Tunjungan Plaza Retail",
    brandName: "Tunjungan Plaza",
    segment: "Retail",
    status: "Active",
    region: "East Java",
    city: "Surabaya",
    address: "Jl. Basuki Rahmat No. 8, Tegalsari",
    servicePointId: "sp-surabaya",
    picName: "Laras Widyaningrum",
    picPhone: "+62 813-5521-0084",
    picEmail: "laras.w@tunjunganplaza.example",
    activeTerminalCount: 9,
  },
  {
    id: "m-spbu-waru",
    mid: "MID-2026-0007",
    name: "Pertamina Waru",
    brandName: "Pertamina",
    segment: "Fuel",
    status: "Active",
    region: "East Java",
    city: "Surabaya",
    address: "Jl. Raya Waru No. 19, Sidoarjo",
    servicePointId: "sp-surabaya",
    picName: "Bambang Hartono",
    picPhone: "+62 811-3400-7280",
    picEmail: "bambang.h@pertamina.example",
    activeTerminalCount: 4,
  },
  {
    id: "m-medan-fair",
    mid: "MID-2026-0008",
    name: "Medan Fair Market",
    brandName: "Medan Fair",
    segment: "Retail",
    status: "Active",
    region: "North Sumatra",
    city: "Medan",
    address: "Jl. Gatot Subroto No. 30, Medan Petisah",
    servicePointId: "sp-medan",
    picName: "Cut Amelia",
    picPhone: "+62 812-6400-4412",
    picEmail: "amelia@medanfair.example",
    activeTerminalCount: 5,
  },
  {
    id: "m-denpasar-beach",
    mid: "MID-2026-0009",
    name: "Denpasar Beach Club",
    brandName: "Denpasar Beach Club",
    segment: "Hospitality",
    status: "Inactive",
    region: "Bali Nusra",
    city: "Denpasar",
    address: "Jl. Pantai Sindhu No. 12, Sanur",
    servicePointId: "sp-denpasar",
    picName: "Made Arya",
    picPhone: "+62 819-9980-6001",
    picEmail: "arya@denpasarbeach.example",
    activeTerminalCount: 2,
  },
  {
    id: "m-semarang-pemuda",
    mid: "MID-2026-0010",
    name: "Semarang Pemuda Mart",
    brandName: "Pemuda Mart",
    segment: "Grocery",
    status: "Active",
    region: "Central Java",
    city: "Semarang",
    address: "Jl. Pemuda No. 101, Sekayu",
    servicePointId: "sp-semarang",
    picName: "Hendra Wijaya",
    picPhone: "+62 812-2400-5508",
    picEmail: "hendra@pemudamart.example",
    activeTerminalCount: 4,
  },
  {
    id: "m-makassar-pettarani",
    mid: "MID-2026-0011",
    name: "Makassar Pettarani Store",
    brandName: "Pettarani Store",
    segment: "Retail",
    status: "Active",
    region: "Sulawesi",
    city: "Makassar",
    address: "Jl. A. P. Pettarani No. 88, Rappocini",
    servicePointId: "sp-makassar",
    picName: "Andi Farhan",
    picPhone: "+62 813-4550-7710",
    picEmail: "farhan@pettaranistore.example",
    activeTerminalCount: 4,
  },
];

export const CONTRACT_ACCOUNTS: ContractAccount[] = [
  {
    id: "acct-indomaret-jabodetabek",
    accountNumber: "ACC-2026-0001",
    accountName: "Indomaret Jabodetabek Master",
    merchantId: "m-indomaret-cikini",
    accountType: "Corporate",
    status: "Active",
    billingName: "PT Indomarco Prismatama",
    billingAddress: "Jl. Pantai Indah Kapuk Boulevard No. 1",
    billingCity: "Jakarta",
    billingRegion: "Jabodetabek North",
    taxId: "01.234.567.8-091.000",
    picName: "Rendra Saputra",
    picPhone: "+62 812-1188-4104",
    picEmail: "rendra.saputra@indomaret.example",
    defaultServicePointId: "sp-jkt-pusat",
    paymentTerm: "Net 30",
    billingCycle: "Monthly",
    contractOwner: "Ayu Mahendra",
    effectiveDate: "2026-05-01",
  },
  {
    id: "acct-bca-enterprise",
    accountNumber: "ACC-2026-0002",
    accountName: "BCA Enterprise EDC",
    merchantId: "m-bca-sudirman",
    accountType: "Corporate",
    status: "Inactive",
    billingName: "PT Bank Central Asia Tbk",
    billingAddress: "Menara BCA, Grand Indonesia",
    billingCity: "Jakarta",
    billingRegion: "Jabodetabek North",
    taxId: "01.001.234.5-093.000",
    picName: "Niko Prasetya",
    picPhone: "+62 811-9040-2201",
    picEmail: "niko.prasetya@bca.example",
    defaultServicePointId: "sp-jkt-pusat",
    paymentTerm: "Net 45",
    billingCycle: "Monthly",
    contractOwner: "Rafi Hidayat",
    effectiveDate: "2026-05-15",
  },
  {
    id: "acct-hypermart-west-java",
    accountNumber: "ACC-2026-0003",
    accountName: "Hypermart West Java",
    merchantId: "m-hypermart-bandung",
    accountType: "Branch",
    status: "Active",
    billingName: "PT Matahari Putra Prima Tbk",
    billingAddress: "Jl. Merdeka No. 56, Bandung Wetan",
    billingCity: "Bandung",
    billingRegion: "West Java",
    taxId: "02.456.771.8-421.000",
    picName: "Dita Rahmani",
    picPhone: "+62 812-7780-1604",
    picEmail: "dita.rahmani@hypermart.example",
    defaultServicePointId: "sp-bandung",
    paymentTerm: "Net 30",
    billingCycle: "Monthly",
    contractOwner: "Ayu Mahendra",
    effectiveDate: "2026-04-20",
  },
  {
    id: "acct-kopi-braga-review",
    accountNumber: "ACC-2026-0004",
    accountName: "Kopi Braga Franchise",
    merchantId: "m-kopi-braga",
    accountType: "Aggregator",
    status: "Inactive",
    billingName: "CV Kopi Braga Nusantara",
    billingAddress: "Jl. Braga No. 21, Sumur Bandung",
    billingCity: "Bandung",
    billingRegion: "West Java",
    taxId: "",
    picName: "Arman Wicaksono",
    picPhone: "+62 857-3100-9244",
    picEmail: "arman@kopibraga.example",
    defaultServicePointId: "sp-bandung",
    paymentTerm: "Net 14",
    billingCycle: "Monthly",
    contractOwner: "Nadia Putri",
    effectiveDate: "2026-06-01",
  },
  {
    id: "acct-tunjungan-plaza",
    accountNumber: "ACC-2026-0005",
    accountName: "Tunjungan Plaza Retail Estate",
    merchantId: "m-tunjungan-plaza",
    accountType: "Branch",
    status: "Inactive",
    billingName: "PT Pakuwon Jati Tbk",
    billingAddress: "Jl. Basuki Rahmat No. 8, Tegalsari",
    billingCity: "Surabaya",
    billingRegion: "East Java",
    taxId: "03.912.557.1-611.000",
    picName: "Laras Widyaningrum",
    picPhone: "+62 813-5521-0084",
    picEmail: "laras.w@tunjunganplaza.example",
    defaultServicePointId: "sp-surabaya",
    paymentTerm: "Net 30",
    billingCycle: "Quarterly",
    contractOwner: "Rafi Hidayat",
    effectiveDate: "2026-03-10",
  },
];

export const PROJECTS: Project[] = [
  {
    id: "project-jabodetabek-rollout",
    name: "Jabodetabek Terminal Rollout",
    code: "PRJ-2026-0001",
    description: "Rollout EDC terminal batch for high-volume retail outlets.",
    status: "Active",
    contractLineNumber: "CL-2026-0001",
    contractLineName: "Monthly rental - Jabodetabek",
    contractLineStatus: "Linked",
  },
  {
    id: "project-bca-enterprise",
    name: "BCA Enterprise Bundle",
    code: "PRJ-2026-0002",
    description: "Enterprise EDC package activation for banking locations.",
    status: "Active",
    contractLineNumber: "CL-2026-0007",
    contractLineName: "Enterprise EDC bundle",
    contractLineStatus: "Ready",
  },
  {
    id: "project-west-java-refresh",
    name: "West Java Branch Refresh",
    code: "PRJ-2026-0003",
    description: "Refresh old terminal estate and update branch coverage.",
    status: "Active",
    contractLineNumber: "CL-2026-0011",
    contractLineName: "West Java branch rollout",
    contractLineStatus: "Linked",
  },
  {
    id: "project-franchise-pilot",
    name: "Franchise Pilot Review",
    code: "PRJ-2026-0004",
    description: "Pilot commercial review before contract line activation.",
    status: "Inactive",
    contractLineNumber: "-",
    contractLineName: "Not linked",
    contractLineStatus: "Not Linked",
  },
];

export const CONTRACT_LINES: ContractLine[] = [
  {
    id: "cl-2026-0001",
    lineNumber: "CL-2026-0001",
    lineName: "Monthly rental - Jabodetabek",
    vendorName: "EDC Vendor Nusantara",
    accountId: "acct-indomaret-jabodetabek",
    projectId: "project-jabodetabek-rollout",
    serviceItem: "EDC terminal rental and maintenance",
    startDate: "2026-05-01",
    endDate: "2027-04-30",
    status: "Active",
    documentStatus: "Signed",
    notes: "Base monthly rental line for Jabodetabek retail distribution.",
  },
  {
    id: "cl-2026-0007",
    lineNumber: "CL-2026-0007",
    lineName: "Enterprise EDC bundle",
    vendorName: "EDC Vendor Nusantara",
    accountId: "acct-bca-enterprise",
    projectId: "project-bca-enterprise",
    serviceItem: "Enterprise terminal bundle",
    startDate: "2026-05-15",
    endDate: "2027-05-14",
    status: "Inactive",
    documentStatus: "Document Verification",
    notes: "Awaiting final account activation before distribution.",
  },
  {
    id: "cl-2026-0011",
    lineNumber: "CL-2026-0011",
    lineName: "West Java branch rollout",
    vendorName: "EDC Vendor Nusantara",
    accountId: "acct-hypermart-west-java",
    projectId: "project-west-java-refresh",
    serviceItem: "Branch rollout terminal package",
    startDate: "2026-04-20",
    endDate: "2027-04-19",
    status: "Active",
    documentStatus: "Hardcopy Sent",
    notes: "Supports West Java branch refresh and replacement planning.",
  },
  {
    id: "cl-2026-0009",
    lineNumber: "CL-2026-0009",
    lineName: "Retail estate renewal",
    vendorName: "EDC Vendor Nusantara",
    accountId: "acct-tunjungan-plaza",
    projectId: "project-franchise-pilot",
    serviceItem: "Retail estate renewal package",
    startDate: "2026-03-10",
    endDate: "2027-03-09",
    status: "Inactive",
    documentStatus: "Archived",
    notes: "Paused until commercial renewal is re-approved.",
  },
];

export const TERMINALS: Terminal[] = [
  {
    id: "term-1001",
    tid: "TID-1001",
    merchantId: "m-indomaret-cikini",
    servicePointId: "sp-jkt-pusat",
    model: "PAX A920",
    status: "Active",
    lastSignal: "8 min ago",
  },
  {
    id: "term-1002",
    tid: "TID-1002",
    merchantId: "m-alfamart-kuningan",
    servicePointId: "sp-jkt-pusat",
    model: "Verifone V240m",
    status: "Problem",
    lastSignal: "2 h ago",
  },
  {
    id: "term-1003",
    tid: "TID-1003",
    merchantId: "m-bca-sudirman",
    servicePointId: "sp-jkt-pusat",
    model: "Ingenico Move/2500",
    status: "Active",
    lastSignal: "12 min ago",
  },
  {
    id: "term-2001",
    tid: "TID-2001",
    merchantId: "m-hypermart-bandung",
    servicePointId: "sp-bandung",
    model: "PAX A920",
    status: "Active",
    lastSignal: "17 min ago",
  },
  {
    id: "term-2002",
    tid: "TID-2002",
    merchantId: "m-kopi-braga",
    servicePointId: "sp-bandung",
    model: "Verifone V240m",
    status: "Maintenance",
    lastSignal: "41 min ago",
  },
  {
    id: "term-3001",
    tid: "TID-3001",
    merchantId: "m-tunjungan-plaza",
    servicePointId: "sp-surabaya",
    model: "Ingenico Move/2500",
    status: "Problem",
    lastSignal: "3 h ago",
  },
  {
    id: "term-3002",
    tid: "TID-3002",
    merchantId: "m-spbu-waru",
    servicePointId: "sp-surabaya",
    model: "PAX A920",
    status: "Problem",
    lastSignal: "4 h ago",
  },
  {
    id: "term-4001",
    tid: "TID-4001",
    merchantId: "m-medan-fair",
    servicePointId: "sp-medan",
    model: "Verifone V240m",
    status: "Active",
    lastSignal: "21 min ago",
  },
  {
    id: "term-5001",
    tid: "TID-5001",
    merchantId: "m-denpasar-beach",
    servicePointId: "sp-denpasar",
    model: "Ingenico Move/2500",
    status: "Problem",
    lastSignal: "Offline",
  },
  {
    id: "term-6001",
    tid: "TID-6001",
    merchantId: "m-semarang-pemuda",
    servicePointId: "sp-semarang",
    model: "PAX A920",
    status: "Active",
    lastSignal: "14 min ago",
  },
  {
    id: "term-7001",
    tid: "TID-7001",
    merchantId: "m-makassar-pettarani",
    servicePointId: "sp-makassar",
    model: "Verifone V240m",
    status: "Active",
    lastSignal: "27 min ago",
  },
];

export const WAREHOUSES: Warehouse[] = [
  {
    id: "wh-jkt-central",
    code: "WH-JKT-01",
    name: "Jakarta Central Warehouse",
    status: "Active",
    type: "Central",
    region: "Jabodetabek North",
    city: "Jakarta",
    address: "Jl. Industri Raya No. 18, Sunter",
    managerName: "Raka Mahendra",
    contactPhone: "+62 812-7000-1101",
    capacityTotal: 5000,
    capacityUsed: 3820,
    terminalStock: 2140,
    sparePartStock: 1680,
    inboundPending: 14,
    outboundPending: 22,
    lastAuditAt: "2026-04-24",
    serviceArea: "Jakarta, Bogor, Depok, Tangerang, Bekasi",
  },
  {
    id: "wh-bdg-regional",
    code: "WH-BDG-02",
    name: "Bandung Regional Stockroom",
    status: "Active",
    type: "Regional",
    region: "West Java",
    city: "Bandung",
    address: "Jl. Soekarno Hatta No. 212, Buahbatu",
    managerName: "Maya Kartika",
    contactPhone: "+62 813-4111-2020",
    capacityTotal: 2600,
    capacityUsed: 1690,
    terminalStock: 930,
    sparePartStock: 760,
    inboundPending: 8,
    outboundPending: 12,
    lastAuditAt: "2026-04-21",
    serviceArea: "Bandung, Cimahi, Garut, Tasikmalaya",
  },
  {
    id: "wh-sby-repair",
    code: "WH-SBY-03",
    name: "Surabaya Repair Hub",
    status: "Maintenance",
    type: "Repair Hub",
    region: "East Java",
    city: "Surabaya",
    address: "Jl. Rungkut Industri No. 44, Rungkut",
    managerName: "Dian Prakoso",
    contactPhone: "+62 811-3200-8810",
    capacityTotal: 3200,
    capacityUsed: 2440,
    terminalStock: 1125,
    sparePartStock: 1315,
    inboundPending: 19,
    outboundPending: 9,
    lastAuditAt: "2026-04-18",
    serviceArea: "Surabaya, Sidoarjo, Gresik, Malang",
  },
  {
    id: "wh-mdn-spare",
    code: "WH-MDN-04",
    name: "Medan Spare Pool",
    status: "Active",
    type: "Spare Pool",
    region: "North Sumatra",
    city: "Medan",
    address: "Jl. Gatot Subroto No. 91, Medan Petisah",
    managerName: "Aulia Nasution",
    contactPhone: "+62 812-6500-7731",
    capacityTotal: 1800,
    capacityUsed: 1025,
    terminalStock: 590,
    sparePartStock: 435,
    inboundPending: 6,
    outboundPending: 7,
    lastAuditAt: "2026-04-20",
    serviceArea: "Medan, Binjai, Deli Serdang, Pematangsiantar",
  },
  {
    id: "wh-dps-regional",
    code: "WH-DPS-05",
    name: "Denpasar Regional Warehouse",
    status: "Full",
    type: "Regional",
    region: "Bali Nusra",
    city: "Denpasar",
    address: "Jl. Gatot Subroto Timur No. 55, Kesiman",
    managerName: "Wayan Pradipta",
    contactPhone: "+62 819-8800-6122",
    capacityTotal: 1500,
    capacityUsed: 1435,
    terminalStock: 820,
    sparePartStock: 615,
    inboundPending: 11,
    outboundPending: 18,
    lastAuditAt: "2026-04-17",
    serviceArea: "Bali, Lombok, Mataram, Kupang",
  },
  {
    id: "wh-smg-regional",
    code: "WH-SMG-06",
    name: "Semarang Corridor Warehouse",
    status: "Active",
    type: "Regional",
    region: "Central Java",
    city: "Semarang",
    address: "Jl. Arteri Yos Sudarso No. 7, Tanjung Mas",
    managerName: "Retno Puspita",
    contactPhone: "+62 857-2400-4388",
    capacityTotal: 2400,
    capacityUsed: 1560,
    terminalStock: 880,
    sparePartStock: 680,
    inboundPending: 7,
    outboundPending: 10,
    lastAuditAt: "2026-04-23",
    serviceArea: "Semarang, Salatiga, Kudus, Pekalongan",
  },
  {
    id: "wh-mks-regional",
    code: "WH-MKS-07",
    name: "Makassar Eastern Warehouse",
    status: "Active",
    type: "Regional",
    region: "Sulawesi",
    city: "Makassar",
    address: "Jl. Perintis Kemerdekaan No. 102, Tamalanrea",
    managerName: "Fajar Ramadhan",
    contactPhone: "+62 813-4555-7021",
    capacityTotal: 2100,
    capacityUsed: 1195,
    terminalStock: 760,
    sparePartStock: 435,
    inboundPending: 5,
    outboundPending: 8,
    lastAuditAt: "2026-04-22",
    serviceArea: "Makassar, Parepare, Gowa, Kendari",
  },
  {
    id: "wh-plb-spare",
    code: "WH-PLB-08",
    name: "Palembang Spare Pool",
    status: "Inactive",
    type: "Spare Pool",
    region: "South Sumatra",
    city: "Palembang",
    address: "Jl. Basuki Rahmat No. 28, Kemuning",
    managerName: "Nadia Oktaviani",
    contactPhone: "+62 821-7700-5098",
    capacityTotal: 1200,
    capacityUsed: 310,
    terminalStock: 180,
    sparePartStock: 130,
    inboundPending: 0,
    outboundPending: 2,
    lastAuditAt: "2026-03-30",
    serviceArea: "Palembang, Prabumulih, Ogan Ilir",
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

export const INBOUND_SHIPMENTS: InboundShipment[] = [
  {
    id: "inb-2026-0429-001",
    asnNumber: "ASN-2026-0429-001",
    clientName: "BCA Terminal Pool",
    origin: "Client DC - Kuningan",
    destinationWarehouseId: "wh-jkt-central",
    pickupTeam: "Pickup Team Alpha",
    supervisor: "Bima Santoso",
    status: "Receiving",
    expectedAt: "2026-04-29 10:00",
    pickupAt: "2026-04-29 08:15",
    arrivedAt: "2026-04-29 09:42",
    expectedQty: 120,
    receivedQty: 96,
    discrepancyQty: 0,
    quarantineQty: 0,
    serialScanned: 96,
    qcStatus: "Pending",
    grnNumber: "GRN-2026-0429-014",
    stockDisposition: "Pending Receiving",
    documents: [
      { type: "ASN", ref: "ASN-2026-0429-001", status: "Ready" },
      {
        type: "Pickup Photo",
        ref: "IMG-PU-8841",
        status: "Captured",
        capturedAt: "2026-04-29 08:21",
      },
      {
        type: "Handover",
        ref: "BAST-8841",
        status: "Captured",
        capturedAt: "2026-04-29 08:24",
      },
      { type: "GRN", ref: "GRN-2026-0429-014", status: "Pending" },
    ],
    lines: [
      {
        sku: "EDC-PAX-A920",
        itemName: "PAX A920 Terminal",
        expectedQty: 70,
        receivedQty: 56,
        acceptedQty: 56,
        discrepancyQty: 0,
        serialScanned: 56,
        serialTotal: 70,
      },
      {
        sku: "EDC-V240M",
        itemName: "Verifone V240m Terminal",
        expectedQty: 50,
        receivedQty: 40,
        acceptedQty: 40,
        discrepancyQty: 0,
        serialScanned: 40,
        serialTotal: 50,
      },
    ],
    timeline: [
      {
        label: "ASN received",
        status: "Done",
        timestamp: "2026-04-29 07:48",
        owner: "Client",
      },
      {
        label: "Pickup scan",
        status: "Done",
        timestamp: "2026-04-29 08:15",
        owner: "Pickup Team Alpha",
      },
      {
        label: "Arrival scan",
        status: "Done",
        timestamp: "2026-04-29 09:42",
        owner: "Jakarta Central Warehouse",
      },
      {
        label: "Serial receiving",
        status: "Active",
        timestamp: "96 / 120 scanned",
        owner: "Receiving Desk 02",
      },
      { label: "QC and reconciliation", status: "Pending" },
    ],
  },
  {
    id: "inb-2026-0429-002",
    asnNumber: "ASN-2026-0429-002",
    clientName: "Alfamart Regional Asset",
    origin: "Client DC - Cibitung",
    destinationWarehouseId: "wh-bdg-regional",
    pickupTeam: "Pickup Team Bravo",
    supervisor: "Maya Kartika",
    status: "In Transit",
    expectedAt: "2026-04-29 15:00",
    pickupAt: "2026-04-29 11:30",
    expectedQty: 85,
    receivedQty: 0,
    discrepancyQty: 0,
    quarantineQty: 0,
    serialScanned: 85,
    qcStatus: "Pending",
    stockDisposition: "Pending Receiving",
    documents: [
      { type: "ASN", ref: "ASN-2026-0429-002", status: "Ready" },
      {
        type: "Pickup Photo",
        ref: "IMG-PU-8842",
        status: "Captured",
        capturedAt: "2026-04-29 11:38",
      },
      {
        type: "Handover",
        ref: "BAST-8842",
        status: "Captured",
        capturedAt: "2026-04-29 11:41",
      },
      { type: "Delivery Note", ref: "DN-8842", status: "Ready" },
    ],
    lines: [
      {
        sku: "EDC-PAX-A920",
        itemName: "PAX A920 Terminal",
        expectedQty: 85,
        receivedQty: 0,
        acceptedQty: 0,
        discrepancyQty: 0,
        serialScanned: 85,
        serialTotal: 85,
      },
    ],
    timeline: [
      {
        label: "ASN received",
        status: "Done",
        timestamp: "2026-04-29 09:55",
        owner: "Client",
      },
      {
        label: "Pickup scan",
        status: "Done",
        timestamp: "2026-04-29 11:30",
        owner: "Pickup Team Bravo",
      },
      {
        label: "In transit",
        status: "Active",
        timestamp: "ETA 2026-04-29 15:00",
        owner: "Line haul BDO-02",
      },
      { label: "Arrival scan", status: "Pending" },
      { label: "Receiving / GRN", status: "Pending" },
    ],
  },
  {
    id: "inb-2026-0428-006",
    asnNumber: "ASN-2026-0428-006",
    clientName: "Indomaret Refurbishment",
    origin: "Client Store Sweep - Jakarta",
    destinationWarehouseId: "wh-jkt-central",
    pickupTeam: "Pickup Team Delta",
    supervisor: "Bima Santoso",
    status: "Discrepancy",
    expectedAt: "2026-04-28 14:00",
    pickupAt: "2026-04-28 10:05",
    arrivedAt: "2026-04-28 13:36",
    expectedQty: 64,
    receivedQty: 61,
    discrepancyQty: 3,
    quarantineQty: 0,
    serialScanned: 61,
    qcStatus: "Review",
    grnNumber: "GRN-2026-0428-031",
    stockDisposition: "Discrepancy Review",
    documents: [
      { type: "ASN", ref: "ASN-2026-0428-006", status: "Ready" },
      {
        type: "Pickup Photo",
        ref: "IMG-PU-8790",
        status: "Captured",
        capturedAt: "2026-04-28 10:12",
      },
      {
        type: "Handover",
        ref: "BAST-8790",
        status: "Captured",
        capturedAt: "2026-04-28 10:17",
      },
      { type: "GRN", ref: "GRN-2026-0428-031", status: "Ready" },
    ],
    lines: [
      {
        sku: "EDC-MOVE-2500",
        itemName: "Ingenico Move/2500 Terminal",
        expectedQty: 34,
        receivedQty: 34,
        acceptedQty: 34,
        discrepancyQty: 0,
        serialScanned: 34,
        serialTotal: 34,
      },
      {
        sku: "EDC-V240M",
        itemName: "Verifone V240m Terminal",
        expectedQty: 30,
        receivedQty: 27,
        acceptedQty: 27,
        discrepancyQty: 3,
        serialScanned: 27,
        serialTotal: 30,
      },
    ],
    timeline: [
      {
        label: "ASN received",
        status: "Done",
        timestamp: "2026-04-28 08:20",
        owner: "Client",
      },
      {
        label: "Pickup scan",
        status: "Done",
        timestamp: "2026-04-28 10:05",
        owner: "Pickup Team Delta",
      },
      {
        label: "Arrival scan",
        status: "Done",
        timestamp: "2026-04-28 13:36",
        owner: "Jakarta Central Warehouse",
      },
      {
        label: "ASN vs actual mismatch",
        status: "Issue",
        timestamp: "3 units short",
        owner: "Receiving Desk 01",
      },
      {
        label: "Supervisor review",
        status: "Active",
        owner: "Bima Santoso",
      },
    ],
  },
  {
    id: "inb-2026-0428-009",
    asnNumber: "ASN-2026-0428-009",
    clientName: "Pertamina Field Returns",
    origin: "Client DC - Waru",
    destinationWarehouseId: "wh-sby-repair",
    pickupTeam: "Pickup Team East",
    supervisor: "Dian Prakoso",
    status: "Quarantine",
    expectedAt: "2026-04-28 16:30",
    pickupAt: "2026-04-28 12:55",
    arrivedAt: "2026-04-28 16:10",
    expectedQty: 42,
    receivedQty: 42,
    discrepancyQty: 0,
    quarantineQty: 7,
    serialScanned: 42,
    qcStatus: "Failed",
    grnNumber: "GRN-2026-0428-036",
    stockDisposition: "Quarantine Hold",
    documents: [
      { type: "ASN", ref: "ASN-2026-0428-009", status: "Ready" },
      {
        type: "Pickup Photo",
        ref: "IMG-PU-8807",
        status: "Captured",
        capturedAt: "2026-04-28 13:02",
      },
      { type: "Delivery Note", ref: "DN-8807", status: "Ready" },
      { type: "GRN", ref: "GRN-2026-0428-036", status: "Ready" },
    ],
    lines: [
      {
        sku: "EDC-PAX-A920",
        itemName: "PAX A920 Terminal",
        expectedQty: 42,
        receivedQty: 42,
        acceptedQty: 35,
        discrepancyQty: 7,
        serialScanned: 42,
        serialTotal: 42,
      },
    ],
    timeline: [
      {
        label: "ASN received",
        status: "Done",
        timestamp: "2026-04-28 10:44",
        owner: "Client",
      },
      {
        label: "Pickup condition photo",
        status: "Done",
        timestamp: "2026-04-28 13:02",
        owner: "Pickup Team East",
      },
      {
        label: "Arrival scan",
        status: "Done",
        timestamp: "2026-04-28 16:10",
        owner: "Surabaya Repair Hub",
      },
      {
        label: "Physical QC failed",
        status: "Issue",
        timestamp: "7 damaged units",
        owner: "QC Desk East",
      },
      {
        label: "Quarantine review",
        status: "Active",
        owner: "Dian Prakoso",
      },
    ],
  },
  {
    id: "inb-2026-0427-004",
    asnNumber: "ASN-2026-0427-004",
    clientName: "Hypermart Bandung",
    origin: "Client Store Sweep - Bandung",
    destinationWarehouseId: "wh-bdg-regional",
    pickupTeam: "Pickup Team Priangan",
    supervisor: "Maya Kartika",
    status: "Completed",
    expectedAt: "2026-04-27 13:00",
    pickupAt: "2026-04-27 09:20",
    arrivedAt: "2026-04-27 12:31",
    closedAt: "2026-04-27 16:05",
    expectedQty: 58,
    receivedQty: 58,
    discrepancyQty: 0,
    quarantineQty: 0,
    serialScanned: 58,
    qcStatus: "Passed",
    grnNumber: "GRN-2026-0427-022",
    stockDisposition: "Available / Stock Titipan",
    documents: [
      { type: "ASN", ref: "ASN-2026-0427-004", status: "Ready" },
      {
        type: "Pickup Photo",
        ref: "IMG-PU-8711",
        status: "Captured",
        capturedAt: "2026-04-27 09:28",
      },
      {
        type: "Handover",
        ref: "BAST-8711",
        status: "Captured",
        capturedAt: "2026-04-27 09:31",
      },
      { type: "GRN", ref: "GRN-2026-0427-022", status: "Ready" },
    ],
    lines: [
      {
        sku: "EDC-PAX-A920",
        itemName: "PAX A920 Terminal",
        expectedQty: 38,
        receivedQty: 38,
        acceptedQty: 38,
        discrepancyQty: 0,
        serialScanned: 38,
        serialTotal: 38,
      },
      {
        sku: "EDC-V240M",
        itemName: "Verifone V240m Terminal",
        expectedQty: 20,
        receivedQty: 20,
        acceptedQty: 20,
        discrepancyQty: 0,
        serialScanned: 20,
        serialTotal: 20,
      },
    ],
    timeline: [
      {
        label: "ASN received",
        status: "Done",
        timestamp: "2026-04-27 07:35",
        owner: "Client",
      },
      {
        label: "Pickup scan",
        status: "Done",
        timestamp: "2026-04-27 09:20",
        owner: "Pickup Team Priangan",
      },
      {
        label: "Arrival scan",
        status: "Done",
        timestamp: "2026-04-27 12:31",
        owner: "Bandung Regional Stockroom",
      },
      {
        label: "GRN completed",
        status: "Done",
        timestamp: "2026-04-27 15:12",
        owner: "Receiving Desk Bandung",
      },
      {
        label: "Final reconciliation",
        status: "Done",
        timestamp: "2026-04-27 16:05",
        owner: "Maya Kartika",
      },
    ],
  },
  {
    id: "inb-2026-0429-003",
    asnNumber: "ASN-2026-0429-003",
    clientName: "Medan Fair Market",
    origin: "Client DC - Medan Barat",
    destinationWarehouseId: "wh-mdn-spare",
    pickupTeam: "Pickup Team North",
    supervisor: "Aulia Nasution",
    status: "Expected",
    expectedAt: "2026-04-29 17:00",
    expectedQty: 36,
    receivedQty: 0,
    discrepancyQty: 0,
    quarantineQty: 0,
    serialScanned: 0,
    qcStatus: "Pending",
    stockDisposition: "Pending Receiving",
    documents: [
      { type: "ASN", ref: "ASN-2026-0429-003", status: "Ready" },
      { type: "Pickup Photo", ref: "Waiting pickup", status: "Pending" },
      { type: "Handover", ref: "Waiting pickup", status: "Pending" },
    ],
    lines: [
      {
        sku: "EDC-MOVE-2500",
        itemName: "Ingenico Move/2500 Terminal",
        expectedQty: 36,
        receivedQty: 0,
        acceptedQty: 0,
        discrepancyQty: 0,
        serialScanned: 0,
        serialTotal: 36,
      },
    ],
    timeline: [
      {
        label: "ASN received",
        status: "Done",
        timestamp: "2026-04-29 12:10",
        owner: "Client",
      },
      {
        label: "Pickup scheduled",
        status: "Active",
        timestamp: "2026-04-29 15:30",
        owner: "Pickup Team North",
      },
      { label: "Pickup scan", status: "Pending" },
      { label: "Arrival scan", status: "Pending" },
      { label: "Receiving / GRN", status: "Pending" },
    ],
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "prod-pax-a920",
    sku: "EDC-PAX-A920",
    name: "PAX A920 Terminal",
    brand: "PAX",
    model: "A920",
    category: "Terminal",
    trackingType: "Serialized",
    status: "Active",
    unit: "Unit",
    warrantyMonths: 24,
    minStock: 120,
    description:
      "Android smart POS terminal for merchant deployment, replacement, and refurbishment flows.",
    compatibleAccessories: ["USB-C charging dock", "Thermal paper roll", "SIM tray kit"],
  },
  {
    id: "prod-verifone-v240m",
    sku: "EDC-V240M",
    name: "Verifone V240m Terminal",
    brand: "Verifone",
    model: "V240m",
    category: "Terminal",
    trackingType: "Serialized",
    status: "Active",
    unit: "Unit",
    warrantyMonths: 24,
    minStock: 90,
    description:
      "Portable payment terminal used for retail, grocery, and banking merchant estates.",
    compatibleAccessories: ["Charging base", "Battery pack", "SIM tray kit"],
  },
  {
    id: "prod-ingenico-move-2500",
    sku: "EDC-MOVE-2500",
    name: "Ingenico Move/2500 Terminal",
    brand: "Ingenico",
    model: "Move/2500",
    category: "Terminal",
    trackingType: "Serialized",
    status: "Phasing Out",
    unit: "Unit",
    warrantyMonths: 18,
    minStock: 60,
    description:
      "Legacy mobile terminal still tracked for returns, repair hub intake, and replacement planning.",
    compatibleAccessories: ["Charging cradle", "Battery pack", "Printer cover"],
  },
  {
    id: "prod-dock-usbc",
    sku: "ACC-DOCK-USBC",
    name: "USB-C Charging Dock",
    brand: "EDC.OS",
    model: "Dock-C1",
    category: "Peripheral",
    trackingType: "Serialized",
    status: "Active",
    unit: "Pcs",
    warrantyMonths: 12,
    minStock: 160,
    description:
      "Charging dock accessory for supported Android smart terminal models.",
    compatibleAccessories: ["PAX A920 Terminal"],
  },
  {
    id: "prod-sim-tray-kit",
    sku: "SP-SIM-TRAY",
    name: "SIM Tray Kit",
    brand: "EDC.OS",
    model: "SIM-KIT-01",
    category: "Spare Part",
    trackingType: "Batch",
    status: "Active",
    unit: "Set",
    warrantyMonths: 6,
    minStock: 300,
    description:
      "Replacement SIM tray kit consumed during terminal refurbishment and repair workflows.",
    compatibleAccessories: ["PAX A920 Terminal", "Verifone V240m Terminal"],
  },
  {
    id: "prod-paper-roll",
    sku: "SUP-PAPER-57",
    name: "Thermal Paper Roll 57mm",
    brand: "EDC.OS",
    model: "ROLL-57",
    category: "Spare Part",
    trackingType: "Quantity",
    status: "Active",
    unit: "Roll",
    warrantyMonths: 0,
    minStock: 800,
    description:
      "Consumable paper roll supply for merchant replenishment and technician kits.",
    compatibleAccessories: ["PAX A920 Terminal", "Verifone V240m Terminal"],
  },
];

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "inv-a920-260429-001",
    serialNumber: "SN-A920-260429-001",
    productId: "prod-pax-a920",
    warehouseId: "wh-jkt-central",
    inboundShipmentId: "inb-2026-0429-001",
    status: "Available / Stock Titipan",
    condition: "New",
    ownerClient: "BCA Terminal Pool",
    binLocation: "JKT-A1-01",
    receivedAt: "2026-04-29 10:12",
    lastMovementAt: "2026-04-29 11:05",
    firmwareVersion: "A920.4.18.2",
    warrantyUntil: "2028-04-29",
    notes: "Matched ASN and passed visual inspection.",
    movementHistory: [
      {
        label: "ASN created",
        timestamp: "2026-04-29 07:48",
        location: "Client DC - Kuningan",
        owner: "Client",
      },
      {
        label: "Pickup scan",
        timestamp: "2026-04-29 08:15",
        location: "Pickup Team Alpha",
        owner: "Operations",
      },
      {
        label: "Received to stock",
        timestamp: "2026-04-29 11:05",
        location: "JKT-A1-01",
        owner: "Inventory Controller",
      },
    ],
  },
  {
    id: "inv-a920-260429-002",
    serialNumber: "SN-A920-260429-002",
    productId: "prod-pax-a920",
    warehouseId: "wh-jkt-central",
    inboundShipmentId: "inb-2026-0429-001",
    status: "In Delivery",
    condition: "New",
    ownerClient: "BCA Terminal Pool",
    binLocation: "JKT-A1-02",
    receivedAt: "2026-04-29 10:14",
    lastMovementAt: "2026-04-30 08:40",
    firmwareVersion: "A920.4.18.2",
    warrantyUntil: "2028-04-29",
    notes: "Reserved, picked, and dispatched for merchant installation batch.",
    movementHistory: [
      {
        label: "Arrival scan",
        timestamp: "2026-04-29 09:42",
        location: "Jakarta Central Warehouse",
        owner: "Receiving Desk 02",
      },
      {
        label: "Serial scan",
        timestamp: "2026-04-29 10:14",
        location: "Receiving Desk 02",
        owner: "Inventory Controller",
      },
      {
        label: "Reserved for delivery",
        timestamp: "2026-04-29 12:20",
        location: "Jakarta Central Warehouse",
        owner: "Operations",
        sourceDocument: "DO-2026-0430-001",
      },
      {
        label: "Dispatched",
        timestamp: "2026-04-30 08:40",
        location: "Dispatch Lane JKT-02",
        owner: "Engineer Dispatch Alpha",
        sourceDocument: "DN-2026-0430-001",
      },
    ],
  },
  {
    id: "inv-v240m-260428-017",
    serialNumber: "SN-V240M-260428-017",
    productId: "prod-verifone-v240m",
    warehouseId: "wh-jkt-central",
    inboundShipmentId: "inb-2026-0428-006",
    status: "Discrepancy",
    condition: "Needs QC",
    ownerClient: "Indomaret Refurbishment",
    binLocation: "JKT-DISC-03",
    receivedAt: "2026-04-28 14:08",
    lastMovementAt: "2026-04-28 16:42",
    firmwareVersion: "V240m.2.9.7",
    warrantyUntil: "2027-11-18",
    notes: "Serial exists in scan file but ASN line quantity is short by three units.",
    movementHistory: [
      {
        label: "Pickup scan",
        timestamp: "2026-04-28 10:05",
        location: "Client Store Sweep - Jakarta",
        owner: "Pickup Team Delta",
      },
      {
        label: "Receiving scan",
        timestamp: "2026-04-28 14:08",
        location: "Jakarta Central Warehouse",
        owner: "Receiving Desk 01",
      },
      {
        label: "Discrepancy review",
        timestamp: "2026-04-28 16:42",
        location: "JKT-DISC-03",
        owner: "Bima Santoso",
      },
    ],
  },
  {
    id: "inv-a920-260428-044",
    serialNumber: "SN-A920-260428-044",
    productId: "prod-pax-a920",
    warehouseId: "wh-sby-repair",
    inboundShipmentId: "inb-2026-0428-009",
    status: "Quarantine",
    condition: "Damaged",
    ownerClient: "Pertamina Field Returns",
    binLocation: "SBY-QA-02",
    receivedAt: "2026-04-28 16:35",
    lastMovementAt: "2026-04-28 17:05",
    firmwareVersion: "A920.4.12.1",
    warrantyUntil: "2027-08-12",
    notes: "Cracked casing photographed during physical QC.",
    movementHistory: [
      {
        label: "Condition photo captured",
        timestamp: "2026-04-28 13:02",
        location: "Client DC - Waru",
        owner: "Pickup Team East",
      },
      {
        label: "QC failed",
        timestamp: "2026-04-28 16:48",
        location: "Surabaya Repair Hub",
        owner: "QC Desk East",
      },
      {
        label: "Quarantine hold",
        timestamp: "2026-04-28 17:05",
        location: "SBY-QA-02",
        owner: "Dian Prakoso",
      },
    ],
  },
  {
    id: "inv-move-260427-021",
    serialNumber: "SN-MOVE-260427-021",
    productId: "prod-ingenico-move-2500",
    warehouseId: "wh-bdg-regional",
    inboundShipmentId: "inb-2026-0427-004",
    status: "Available / Stock Titipan",
    condition: "Good",
    ownerClient: "Hypermart Bandung",
    binLocation: "BDG-B2-04",
    receivedAt: "2026-04-27 13:20",
    lastMovementAt: "2026-04-27 16:05",
    firmwareVersion: "MOVE.8.3.4",
    warrantyUntil: "2027-02-01",
    notes: "Completed reconciliation and released to stock titipan.",
    movementHistory: [
      {
        label: "Arrival scan",
        timestamp: "2026-04-27 12:31",
        location: "Bandung Regional Stockroom",
        owner: "Receiving Desk Bandung",
      },
      {
        label: "GRN completed",
        timestamp: "2026-04-27 15:12",
        location: "BDG Receiving",
        owner: "Inventory Controller",
      },
      {
        label: "Available stock",
        timestamp: "2026-04-27 16:05",
        location: "BDG-B2-04",
        owner: "Maya Kartika",
      },
    ],
  },
  {
    id: "inv-dock-260424-112",
    serialNumber: "SN-DOCK-260424-112",
    productId: "prod-dock-usbc",
    warehouseId: "wh-smg-regional",
    status: "Available / Stock Titipan",
    condition: "New",
    ownerClient: "Shared Spare Pool",
    binLocation: "SMG-C1-08",
    receivedAt: "2026-04-24 09:45",
    lastMovementAt: "2026-04-24 10:02",
    warrantyUntil: "2027-04-24",
    notes: "Accessory stock ready for replacement kits.",
    movementHistory: [
      {
        label: "Supplier intake",
        timestamp: "2026-04-24 09:45",
        location: "Semarang Corridor Warehouse",
        owner: "Inventory Controller",
      },
      {
        label: "Putaway",
        timestamp: "2026-04-24 10:02",
        location: "SMG-C1-08",
        owner: "Warehouse Operator",
      },
    ],
  },
  {
    id: "inv-sim-260423-301",
    serialNumber: "SN-SIMKIT-260423-301",
    productId: "prod-sim-tray-kit",
    warehouseId: "wh-jkt-central",
    status: "In Repair",
    condition: "Needs QC",
    ownerClient: "Shared Spare Pool",
    binLocation: "JKT-RP-09",
    receivedAt: "2026-04-23 13:18",
    lastMovementAt: "2026-04-25 09:30",
    warrantyUntil: "2026-10-23",
    notes: "Kit is incomplete and waiting component check.",
    movementHistory: [
      {
        label: "Return intake",
        timestamp: "2026-04-23 13:18",
        location: "Jakarta Central Warehouse",
        owner: "Receiving Desk 03",
      },
      {
        label: "Repair queue",
        timestamp: "2026-04-25 09:30",
        location: "JKT-RP-09",
        owner: "Repair Hub",
      },
    ],
  },
  {
    id: "inv-v240m-installed-008",
    serialNumber: "SN-V240M-250912-008",
    productId: "prod-verifone-v240m",
    warehouseId: "wh-jkt-central",
    status: "Installed",
    condition: "Good",
    ownerClient: "Alfamart Kuningan 11",
    binLocation: "Merchant Site",
    receivedAt: "2025-09-12 10:40",
    lastMovementAt: "2026-04-19 14:15",
    firmwareVersion: "V240m.2.9.3",
    warrantyUntil: "2027-09-12",
    notes: "Installed asset tracked at merchant site.",
    movementHistory: [
      {
        label: "Released from warehouse",
        timestamp: "2026-04-19 09:12",
        location: "Jakarta Central Warehouse",
        owner: "Operations",
      },
      {
        label: "Installed",
        timestamp: "2026-04-19 14:15",
        location: "Alfamart Kuningan 11",
        owner: "Field Service Engineer",
      },
    ],
  },
  {
    id: "inv-a920-delivery-011",
    serialNumber: "SN-A920-260429-011",
    productId: "prod-pax-a920",
    warehouseId: "wh-jkt-central",
    inboundShipmentId: "inb-2026-0429-001",
    status: "In Delivery",
    condition: "New",
    ownerClient: "BCA Merchant Rollout",
    binLocation: "Dispatch Lane JKT-02",
    receivedAt: "2026-04-29 10:18",
    lastMovementAt: "2026-04-30 08:40",
    firmwareVersion: "A920.4.18.2",
    warrantyUntil: "2028-04-29",
    notes: "Allocated to merchant installation order and waiting handover proof.",
    movementHistory: [
      {
        label: "Received to stock",
        timestamp: "2026-04-29 11:12",
        location: "JKT-A1-04",
        owner: "Inventory Controller",
        sourceDocument: "GRN-2026-0429-014",
      },
      {
        label: "Reserved for delivery",
        timestamp: "2026-04-30 07:55",
        location: "Jakarta Central Warehouse",
        owner: "Operations",
        sourceDocument: "DO-2026-0430-001",
      },
      {
        label: "Dispatched",
        timestamp: "2026-04-30 08:40",
        location: "Dispatch Lane JKT-02",
        owner: "Engineer Dispatch Alpha",
        sourceDocument: "DN-2026-0430-001",
      },
    ],
  },
  {
    id: "inv-paper-260426-a",
    serialNumber: "BATCH-PAPER-260426-A",
    productId: "prod-paper-roll",
    warehouseId: "wh-jkt-central",
    status: "Available / Stock Titipan",
    condition: "Good",
    ownerClient: "Shared Supply Pool",
    binLocation: "JKT-SUP-03",
    stockQuantity: 480,
    receivedAt: "2026-04-26 09:30",
    lastMovementAt: "2026-04-30 08:10",
    notes: "Quantity-tracked supplies available for partial delivery to service teams.",
    movementHistory: [
      {
        label: "Supplier intake",
        timestamp: "2026-04-26 09:30",
        location: "Jakarta Central Warehouse",
        owner: "Inventory Controller",
        sourceDocument: "GRN-2026-0426-019",
      },
      {
        label: "Partial allocation",
        timestamp: "2026-04-30 08:10",
        location: "JKT-SUP-03",
        owner: "Supply Desk",
        sourceDocument: "DO-2026-0430-002",
        note: "120 rolls allocated; remaining stock stays available.",
      },
    ],
  },
];

export const DELIVERY_ORDERS: DeliveryOrder[] = [
  {
    id: "del-2026-0430-001",
    orderNumber: "DO-2026-0430-001",
    requestType: "Merchant Install",
    requester: "BCA Merchant Rollout",
    destinationName: "BCA Merchant - Kuningan City",
    destinationType: "Merchant",
    destinationAddress: "Jl. Prof. Dr. Satrio Kav. 18, Jakarta Selatan",
    sourceWarehouseId: "wh-jkt-central",
    assignedTeam: "Engineer Dispatch Alpha",
    supervisor: "Raka Mahendra",
    priority: "High",
    status: "In Delivery",
    requestedAt: "2026-04-30 07:20",
    targetAt: "2026-04-30 14:00",
    dispatchedAt: "2026-04-30 08:40",
    requestedQty: 3,
    allocatedQty: 3,
    deliveredQty: 0,
    proofStatus: "Pending",
    documents: [
      { type: "Delivery Note", ref: "DN-2026-0430-001", status: "Ready" },
      { type: "BAST", ref: "BAST pending", status: "Pending" },
      { type: "Install Proof", ref: "Install photo pending", status: "Pending" },
    ],
    lines: [
      {
        productId: "prod-pax-a920",
        requestedQty: 2,
        allocatedQty: 2,
        deliveredQty: 0,
        trackingType: "Serialized",
        serialNumbers: ["SN-A920-260429-011", "SN-A920-260429-002"],
        sourceWarehouseId: "wh-jkt-central",
      },
      {
        productId: "prod-dock-usbc",
        requestedQty: 1,
        allocatedQty: 1,
        deliveredQty: 0,
        trackingType: "Serialized",
        serialNumbers: ["SN-DOCK-260424-112"],
        sourceWarehouseId: "wh-smg-regional",
      },
    ],
    timeline: [
      {
        label: "Delivery requested",
        status: "Done",
        timestamp: "2026-04-30 07:20",
        owner: "BCA Merchant Rollout",
      },
      {
        label: "Stock reserved",
        status: "Done",
        timestamp: "2026-04-30 07:55",
        owner: "Operations",
      },
      {
        label: "Pick-pack completed",
        status: "Done",
        timestamp: "2026-04-30 08:28",
        owner: "Warehouse Operator",
      },
      {
        label: "In delivery",
        status: "Active",
        timestamp: "ETA 2026-04-30 14:00",
        owner: "Engineer Dispatch Alpha",
      },
      { label: "Handover and install proof", status: "Pending" },
    ],
  },
  {
    id: "del-2026-0430-002",
    orderNumber: "DO-2026-0430-002",
    requestType: "Service Point Replenishment",
    requester: "Jakarta Service Point",
    destinationName: "SP-JKT-Pusat",
    destinationType: "Service Point",
    destinationAddress: "Jakarta Pusat service point buffer",
    sourceWarehouseId: "wh-jkt-central",
    assignedTeam: "Supply Courier 02",
    supervisor: "Bima Santoso",
    priority: "Normal",
    status: "Picked / Packed",
    requestedAt: "2026-04-30 06:50",
    targetAt: "2026-04-30 12:00",
    requestedQty: 120,
    allocatedQty: 120,
    deliveredQty: 0,
    proofStatus: "Pending",
    documents: [
      { type: "Delivery Note", ref: "DN-2026-0430-002", status: "Ready" },
      { type: "BAST", ref: "BAST pending", status: "Pending" },
    ],
    lines: [
      {
        productId: "prod-paper-roll",
        requestedQty: 120,
        allocatedQty: 120,
        deliveredQty: 0,
        trackingType: "Quantity",
        sourceWarehouseId: "wh-jkt-central",
      },
    ],
    timeline: [
      {
        label: "Supply request created",
        status: "Done",
        timestamp: "2026-04-30 06:50",
        owner: "Jakarta Service Point",
      },
      {
        label: "Quantity stock allocated",
        status: "Done",
        timestamp: "2026-04-30 08:10",
        owner: "Supply Desk",
      },
      {
        label: "Pick-pack",
        status: "Active",
        timestamp: "120 rolls staged",
        owner: "Warehouse Operator",
      },
      { label: "Dispatch", status: "Pending" },
      { label: "Handover", status: "Pending" },
    ],
  },
  {
    id: "del-2026-0429-008",
    orderNumber: "DO-2026-0429-008",
    requestType: "Replacement",
    requester: "Alfamart Operations",
    destinationName: "Alfamart Kuningan 11",
    destinationType: "Merchant",
    destinationAddress: "Jl. Kuningan Persada, Jakarta Selatan",
    sourceWarehouseId: "wh-jkt-central",
    assignedTeam: "Field Service Engineer",
    supervisor: "Raka Mahendra",
    priority: "Critical",
    status: "Installed / Assigned",
    requestedAt: "2026-04-29 09:00",
    targetAt: "2026-04-29 16:00",
    dispatchedAt: "2026-04-29 11:40",
    completedAt: "2026-04-29 14:15",
    requestedQty: 1,
    allocatedQty: 1,
    deliveredQty: 1,
    proofStatus: "Complete",
    documents: [
      { type: "Delivery Note", ref: "DN-2026-0429-008", status: "Ready" },
      {
        type: "BAST",
        ref: "BAST-2026-0429-008",
        status: "Signed",
        capturedAt: "2026-04-29 14:12",
      },
      {
        type: "Install Proof",
        ref: "IMG-INSTALL-0429-008",
        status: "Captured",
        capturedAt: "2026-04-29 14:15",
      },
    ],
    lines: [
      {
        productId: "prod-verifone-v240m",
        requestedQty: 1,
        allocatedQty: 1,
        deliveredQty: 1,
        trackingType: "Serialized",
        serialNumbers: ["SN-V240M-250912-008"],
        sourceWarehouseId: "wh-jkt-central",
      },
    ],
    timeline: [
      {
        label: "Replacement approved",
        status: "Done",
        timestamp: "2026-04-29 09:00",
        owner: "Alfamart Operations",
      },
      {
        label: "Dispatched",
        status: "Done",
        timestamp: "2026-04-29 11:40",
        owner: "Field Service Engineer",
      },
      {
        label: "Installed and assigned",
        status: "Done",
        timestamp: "2026-04-29 14:15",
        owner: "Field Service Engineer",
      },
    ],
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
    ],
    submenus: [
      {
        title: "Merchant Directory",
        path: "merchants/directory",
        allowedRoles: [
          "System_Administrator",
          "Operations_Specialist",
          "Contract_Manager",
        ],
        requiresDataMasking: true,
      },
    ],
  },
  {
    parent: "Contract Management",
    icon: LuFileText,
    allowedRoles: ["System_Administrator", "Contract_Manager"],
    submenus: [
      {
        title: "Accounts",
        path: "contracts/accounts",
        allowedRoles: ["System_Administrator", "Contract_Manager"],
      },
      {
        title: "Projects",
        path: "contracts/projects",
        allowedRoles: ["System_Administrator", "Contract_Manager"],
      },
      {
        title: "Contract Lines",
        path: "contracts/lines",
        allowedRoles: ["System_Administrator", "Contract_Manager"],
      },
      {
        title: "Contract Renewals",
        path: "contracts/renewals",
        allowedRoles: ["System_Administrator", "Contract_Manager"],
      },
    ],
  },
  {
    parent: "Asset Management",
    icon: LuPackage,
    allowedRoles: [
      "System_Administrator",
      "Inventory_Controller",
      "Operations_Specialist",
    ],
    submenus: [
      {
        title: "Asset Overview",
        path: "inventory/overview",
        allowedRoles: [
          "System_Administrator",
          "Inventory_Controller",
          "Operations_Specialist",
        ],
      },
      {
        title: "Asset Registry",
        path: "inventory/list",
        allowedRoles: [
          "System_Administrator",
          "Inventory_Controller",
          "Operations_Specialist",
        ],
      },
      {
        title: "Inbound Receiving",
        path: "inventory/inbound",
        allowedRoles: ["System_Administrator", "Inventory_Controller"],
      },
      {
        title: "Delivery / Outbound",
        path: "inventory/outbound",
        allowedRoles: ["System_Administrator", "Inventory_Controller"],
      },
      {
        title: "Service Point Stock",
        path: "inventory/service-points",
        allowedRoles: [
          "System_Administrator",
          "Inventory_Controller",
          "Operations_Specialist",
        ],
      },
      {
        title: "Asset Archive",
        path: "inventory/archive",
        allowedRoles: ["System_Administrator", "Inventory_Controller"],
      },
    ],
  },
  {
    parent: "Products",
    icon: LuPackage,
    allowedRoles: [
      "System_Administrator",
      "Inventory_Controller",
      "Operations_Specialist",
    ],
    submenus: [
      {
        title: "Product List",
        path: "products/list",
        allowedRoles: [
          "System_Administrator",
          "Inventory_Controller",
          "Operations_Specialist",
        ],
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
