import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  LuArrowDownRight,
  LuArrowRight,
  LuArrowUpRight,
  LuDownload,
  LuEllipsis,
  LuPlus,
  LuRadio,
} from "react-icons/lu";

import { useAuth } from "~/context/AuthContext";
import {
  ACTIVITY_DATA,
  KPI_DATA,
  RECENT_JOBS,
  ROLES,
  SERVICE_POINT_STATUS,
} from "~/data/mockData";

import type { RecentJob, ServicePointStatus } from "~/data/mockData";

export function meta() {
  return [
    { title: "Dashboard | EDC.OS" },
    { name: "description", content: "EDC.OS operations dashboard." },
  ];
}

function StatusDot({ status }: { status: ServicePointStatus["status"] }) {
  const colorMap: Record<ServicePointStatus["status"], string> = {
    Online: "bg-emerald-500",
    Degraded: "bg-amber-500",
    Offline: "bg-rose-500",
  };

  return <span className={`h-2 w-2 shrink-0 rounded-full ${colorMap[status]}`} />;
}

function SLABadge({ value }: { value: RecentJob["sla"] }) {
  const colorMap: Record<RecentJob["sla"], string> = {
    "On Track": "border-emerald-200 bg-emerald-100 text-emerald-700",
    "At Risk": "border-amber-200 bg-amber-100 text-amber-700",
    Breached: "border-rose-200 bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${colorMap[value]}`}
    >
      {value}
    </span>
  );
}

function StatusBadge({ value }: { value: RecentJob["status"] }) {
  const colorMap: Record<RecentJob["status"], string> = {
    "In Progress": "bg-[#DDE0EC] text-[#0E2748]",
    Pending: "bg-amber-100 text-amber-700",
    Completed: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${colorMap[value]}`}>
      {value}
    </span>
  );
}

export default function Dashboard() {
  const { user, activeRole } = useAuth();
  const role = ROLES.find((item) => item.key === activeRole) ?? ROLES[0];
  const firstName = user?.name.split(" ")[0] ?? "operator";

  return (
    <div className="animate-fade-up space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
            Today -{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0E2748] md:text-4xl">
            Hello, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-[#0E2748]/60">
            You are viewing the console as{" "}
            <span className="font-semibold text-[#0E2748]">{role.label}</span>.
            Here is the operations pulse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#DDE0EC] bg-white px-4 text-sm font-semibold text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40"
            data-testid="dashboard-export-btn"
          >
            <LuDownload className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Export
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#0E2748] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3F6FA8]"
            data-testid="dashboard-new-jo-btn"
          >
            <LuPlus className="mr-2 h-4 w-4" strokeWidth={2} />
            New Job Order
          </button>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="kpi-grid"
      >
        {KPI_DATA.map((kpi, index) => {
          const Icon = kpi.icon;
          const isUp = kpi.trend === "up";

          return (
            <div
              key={kpi.label}
              className="group rounded-2xl border border-[#DDE0EC] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#3F6FA8]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DDE0EC]/60 transition-colors group-hover:bg-[#3F6FA8] group-hover:text-white">
                  <Icon
                    className="h-4 w-4 text-[#3F6FA8] group-hover:text-white"
                    strokeWidth={1.75}
                  />
                </div>
                <span
                  className={`flex items-center gap-1 text-[11px] font-semibold ${
                    isUp ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {isUp ? (
                    <LuArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <LuArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
                  )}
                  {kpi.delta}
                </span>
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-wider text-[#0E2748]/60">
                {kpi.label}
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[#0E2748]">
                {kpi.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#DDE0EC] bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0E2748]">
                Terminal Activity
              </h3>
              <p className="text-xs text-[#0E2748]/60">
                Deployed vs retrieved this week
              </p>
            </div>
            <div className="flex gap-1.5">
              {["7D", "30D", "90D"].map((period, index) => (
                <button
                  type="button"
                  key={period}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    index === 0
                      ? "bg-[#0E2748] text-white"
                      : "text-[#0E2748]/60 hover:bg-[#DDE0EC]/50"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="deployed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3F6FA8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3F6FA8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="retrieved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E2748" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0E2748" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#DDE0EC"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="#0E2748"
                  tick={{ fontSize: 11, fill: "#0E2748", opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#0E2748"
                  tick={{ fontSize: 11, fill: "#0E2748", opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0E2748",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                  }}
                  cursor={{
                    stroke: "#3F6FA8",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="deployed"
                  stroke="#3F6FA8"
                  strokeWidth={2}
                  fill="url(#deployed)"
                  name="Deployed"
                />
                <Area
                  type="monotone"
                  dataKey="retrieved"
                  stroke="#0E2748"
                  strokeWidth={2}
                  fill="url(#retrieved)"
                  name="Retrieved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#DDE0EC] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0E2748]">
                Service Points
              </h3>
              <p className="text-xs text-[#0E2748]/60">Live regional load</p>
            </div>
            <LuRadio className="h-4 w-4 text-[#3F6FA8]" strokeWidth={1.75} />
          </div>
          <div className="space-y-3">
            {SERVICE_POINT_STATUS.map((servicePoint) => (
              <div key={servicePoint.name} className="flex items-center gap-3">
                <StatusDot status={servicePoint.status} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="truncate text-xs font-medium text-[#0E2748]">
                      {servicePoint.name}
                    </p>
                    <p className="text-[11px] text-[#0E2748]/60">
                      {servicePoint.load}%
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#DDE0EC]/50">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        servicePoint.load > 85
                          ? "bg-rose-500"
                          : servicePoint.load > 60
                            ? "bg-amber-500"
                            : "bg-[#3F6FA8]"
                      }`}
                      style={{ width: `${servicePoint.load}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-[#DDE0EC] bg-white"
        data-testid="recent-jobs-table"
      >
        <div className="flex flex-col gap-3 border-b border-[#DDE0EC] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#0E2748]">
              Recent Job Orders
            </h3>
            <p className="text-xs text-[#0E2748]/60">
              Latest field operations across regions
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-fit items-center rounded-md border border-[#DDE0EC] bg-white px-3 text-sm font-medium text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40"
          >
            View all
            <LuArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#DDE0EC]">
                {[
                  "JO ID",
                  "Merchant",
                  "Type",
                  "Engineer",
                  "Status",
                  "SLA",
                  "Updated",
                  "",
                ].map((header) => (
                  <th
                    key={header || "actions"}
                    className="h-10 px-4 text-left align-middle text-[10px] font-medium uppercase tracking-wider text-[#0E2748]/60"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_JOBS.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-[#DDE0EC] transition-colors last:border-b-0 hover:bg-[#F6F7F9]/60"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0E2748]">
                    {job.id}
                  </td>
                  <td className="px-4 py-3 text-[#0E2748]">{job.merchant}</td>
                  <td className="px-4 py-3 text-[#0E2748]/80">{job.type}</td>
                  <td className="px-4 py-3 text-[#0E2748]/80">{job.engineer}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={job.status} />
                  </td>
                  <td className="px-4 py-3">
                    <SLABadge value={job.sla} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#0E2748]/60">
                    {job.updated}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#DDE0EC]/50"
                      aria-label={`Open ${job.id} actions`}
                    >
                      <LuEllipsis
                        className="h-4 w-4 text-[#0E2748]/60"
                        strokeWidth={2}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
