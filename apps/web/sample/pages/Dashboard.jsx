import * as Icons from "lucide-react";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ROLES, KPI_DATA, ACTIVITY_DATA, SERVICE_POINT_STATUS, RECENT_JOBS } from "@/data/mockData";

const StatusDot = ({ status }) => {
  const map = {
    Online: "bg-emerald-500",
    Degraded: "bg-amber-500",
    Offline: "bg-rose-500",
  };
  return <span className={`w-2 h-2 rounded-full ${map[status]}`} />;
};

const SLABadge = ({ value }) => {
  const map = {
    "On Track": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "At Risk": "bg-amber-100 text-amber-700 border-amber-200",
    "Breached": "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${map[value]}`}>
      {value}
    </span>
  );
};

const StatusBadge = ({ value }) => {
  const map = {
    "In Progress": "bg-[#DDE0EC] text-[#0E2748]",
    "Pending": "bg-amber-100 text-amber-700",
    "Completed": "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${map[value]}`}>
      {value}
    </span>
  );
};

export default function Dashboard() {
  const { user, activeRole } = useAuth();
  const role = ROLES.find((r) => r.key === activeRole);

  return (
    <div className="space-y-6 animate-fade-up" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8] mb-2">
            Today · {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[#0E2748] tracking-tight">
            Hello, {user.name.split(" ")[0]}.
          </h1>
          <p className="text-sm text-[#0E2748]/60 mt-1">
            You are viewing the console as <span className="font-semibold text-[#0E2748]">{role?.label}</span>. Here is the operations pulse.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#DDE0EC] bg-white hover:bg-[#DDE0EC]/40 text-[#0E2748]" data-testid="dashboard-export-btn">
            <Icons.Download className="w-4 h-4 mr-2" strokeWidth={1.75} />
            Export
          </Button>
          <Button className="bg-[#0E2748] hover:bg-[#3F6FA8] text-white" data-testid="dashboard-new-jo-btn">
            <Icons.Plus className="w-4 h-4 mr-2" strokeWidth={2} />
            New Job Order
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
        {KPI_DATA.map((kpi, i) => {
          const Icon = Icons[kpi.icon];
          const isUp = kpi.trend === "up";
          return (
            <div
              key={kpi.label}
              className="group bg-white border border-[#DDE0EC] rounded-2xl p-5 hover:border-[#3F6FA8] hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#DDE0EC]/60 flex items-center justify-center group-hover:bg-[#3F6FA8] group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4 text-[#3F6FA8] group-hover:text-white" strokeWidth={1.75} />
                </div>
                <span className={`flex items-center gap-1 text-[11px] font-semibold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} /> : <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />}
                  {kpi.delta}
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-wider text-[#0E2748]/60 mt-4">{kpi.label}</p>
              <p className="font-display text-3xl font-bold text-[#0E2748] tracking-tight mt-1">
                {kpi.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart + Service points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#DDE0EC] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#0E2748]">Terminal Activity</h3>
              <p className="text-xs text-[#0E2748]/60">Deployed vs retrieved this week</p>
            </div>
            <div className="flex gap-1.5">
              {["7D", "30D", "90D"].map((p, i) => (
                <button
                  key={p}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                    i === 0 ? "bg-[#0E2748] text-white" : "text-[#0E2748]/60 hover:bg-[#DDE0EC]/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3F6FA8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3F6FA8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E2748" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0E2748" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE0EC" vertical={false} />
                <XAxis dataKey="day" stroke="#0E2748" tick={{ fontSize: 11, fill: "#0E2748", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#0E2748" tick={{ fontSize: 11, fill: "#0E2748", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0E2748",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                  }}
                  cursor={{ stroke: "#3F6FA8", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area type="monotone" dataKey="deployed" stroke="#3F6FA8" strokeWidth={2} fill="url(#g1)" name="Deployed" />
                <Area type="monotone" dataKey="retrieved" stroke="#0E2748" strokeWidth={2} fill="url(#g2)" name="Retrieved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#DDE0EC] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#0E2748]">Service Points</h3>
              <p className="text-xs text-[#0E2748]/60">Live regional load</p>
            </div>
            <Icons.Radio className="w-4 h-4 text-[#3F6FA8]" strokeWidth={1.75} />
          </div>
          <div className="space-y-3">
            {SERVICE_POINT_STATUS.map((sp) => (
              <div key={sp.name} className="flex items-center gap-3">
                <StatusDot status={sp.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-[#0E2748] truncate">{sp.name}</p>
                    <p className="text-[11px] text-[#0E2748]/60">{sp.load}%</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#DDE0EC]/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        sp.load > 85 ? "bg-rose-500" : sp.load > 60 ? "bg-amber-500" : "bg-[#3F6FA8]"
                      }`}
                      style={{ width: `${sp.load}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white border border-[#DDE0EC] rounded-2xl overflow-hidden" data-testid="recent-jobs-table">
        <div className="flex items-center justify-between p-5 border-b border-[#DDE0EC]">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#0E2748]">Recent Job Orders</h3>
            <p className="text-xs text-[#0E2748]/60">Latest field operations across regions</p>
          </div>
          <Button variant="outline" size="sm" className="border-[#DDE0EC] bg-white text-[#0E2748] hover:bg-[#DDE0EC]/40">
            View all
            <Icons.ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={2} />
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-[#DDE0EC] hover:bg-transparent">
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">JO ID</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">Merchant</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">Type</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">Engineer</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">SLA</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-[#0E2748]/60">Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RECENT_JOBS.map((j) => (
              <TableRow key={j.id} className="border-[#DDE0EC] hover:bg-[#F6F7F9]/60">
                <TableCell className="font-mono text-xs font-semibold text-[#0E2748]">{j.id}</TableCell>
                <TableCell className="text-sm text-[#0E2748]">{j.merchant}</TableCell>
                <TableCell className="text-sm text-[#0E2748]/80">{j.type}</TableCell>
                <TableCell className="text-sm text-[#0E2748]/80">{j.engineer}</TableCell>
                <TableCell><StatusBadge value={j.status} /></TableCell>
                <TableCell><SLABadge value={j.sla} /></TableCell>
                <TableCell className="text-xs text-[#0E2748]/60">{j.updated}</TableCell>
                <TableCell>
                  <button className="w-7 h-7 rounded-md hover:bg-[#DDE0EC]/50 flex items-center justify-center">
                    <MoreHorizontal className="w-4 h-4 text-[#0E2748]/60" strokeWidth={2} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
