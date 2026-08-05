export const ROLES = [
  { key: "System_Administrator", label: "System Administrator", short: "SysAdmin", color: "bg-[#0E2748] text-white" },
  { key: "Operations_Specialist", label: "Operations Specialist", short: "Operations", color: "bg-[#3F6FA8] text-white" },
  { key: "Inventory_Controller", label: "Inventory Controller", short: "Inventory", color: "bg-emerald-600 text-white" },
  { key: "Contract_Manager", label: "Contract Manager", short: "Contract", color: "bg-amber-600 text-white" },
  { key: "Field_Service_Engineer", label: "Field Service Engineer", short: "Field Engineer", color: "bg-rose-600 text-white" },
];

export const MOCK_USERS = [
  {
    email: "admin@edc.io",
    password: "admin123",
    name: "Hadyan Pratama",
    initials: "HP",
    role: "System_Administrator",
    department: "IT — Platform",
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

export const KPI_DATA = [
  { label: "Total Terminals", value: 12847, delta: "+4.2%", trend: "up", icon: "CreditCard" },
  { label: "Active Merchants", value: 3214, delta: "+1.8%", trend: "up", icon: "Building2" },
  { label: "Open Job Orders", value: 184, delta: "-6.1%", trend: "down", icon: "ClipboardList" },
  { label: "Pending Deliveries", value: 47, delta: "+12.4%", trend: "up", icon: "Truck" },
];

export const ACTIVITY_DATA = [
  { day: "Mon", deployed: 42, retrieved: 18 },
  { day: "Tue", deployed: 51, retrieved: 22 },
  { day: "Wed", deployed: 38, retrieved: 27 },
  { day: "Thu", deployed: 64, retrieved: 19 },
  { day: "Fri", deployed: 73, retrieved: 31 },
  { day: "Sat", deployed: 29, retrieved: 14 },
  { day: "Sun", deployed: 21, retrieved: 9 },
];

export const SERVICE_POINT_STATUS = [
  { name: "SP Jakarta Pusat", status: "Online", load: 78 },
  { name: "SP Bandung", status: "Online", load: 54 },
  { name: "SP Surabaya", status: "Degraded", load: 92 },
  { name: "SP Medan", status: "Online", load: 38 },
  { name: "SP Denpasar", status: "Offline", load: 0 },
];

export const RECENT_JOBS = [
  { id: "JO-24871", merchant: "Indomaret Cikini 04", type: "Installation", engineer: "Bagus R.", status: "In Progress", sla: "On Track", updated: "12 min ago" },
  { id: "JO-24870", merchant: "Alfamart Kuningan 11", type: "Replacement", engineer: "Dewi S.", status: "Pending", sla: "At Risk", updated: "34 min ago" },
  { id: "JO-24868", merchant: "BCA Sudirman", type: "Maintenance", engineer: "Rian P.", status: "Completed", sla: "On Track", updated: "1 h ago" },
  { id: "JO-24866", merchant: "Pertamina Senayan", type: "Repair", engineer: "Faiz M.", status: "In Progress", sla: "Breached", updated: "2 h ago" },
  { id: "JO-24862", merchant: "Hypermart Bandung", type: "Installation", engineer: "Anissa K.", status: "Completed", sla: "On Track", updated: "3 h ago" },
];
