import { useEffect, useMemo, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import {
  LuActivity,
  LuBriefcaseBusiness,
  LuCheck,
  LuChevronRight,
  LuChevronLeft,
  LuChevronsLeft,
  LuChevronsRight,
  LuCpu,
  LuCrown,
  LuMapPinned,
  LuMapPin,
  LuMinus,
  LuPlus,
  LuRadio,
  LuSearch,
  LuStore,
  LuTriangleAlert,
  LuUsers,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  MERCHANTS,
  SERVICE_POINTS,
  TECHNICIAN_SERVICE_POINT_ASSIGNMENTS,
  TECHNICIANS,
  TERMINALS,
  WORK_CLUSTERS,
} from "~/data/mockData";

import type {
  Merchant,
  ServicePoint,
  Technician,
  Terminal,
  WorkCluster,
  WorkClusterStatus,
} from "~/data/mockData";

type ClusterAssignment = Record<string, string[]>;
type DetailTab = "service-points" | "technicians" | "merchants" | "terminals";
type AddClusterItemType = "technician" | "merchant" | "terminal";
type PaginationItem = number | "ellipsis";

type ClusterStats = {
  activeTechnicians: number;
  inactiveTechnicians: number;
  merchantCount: number;
  activeTerminals: number;
  problemTerminals: number;
  maintenanceTerminals: number;
  openJobs: number;
  averageLoad: number;
  status: WorkClusterStatus;
};

type NewClusterForm = {
  name: string;
  region: string;
  leaderUsername: string;
  slaScore: string;
  riskIndicator: string;
};

const detailTabs: { id: DetailTab; label: string }[] = [
  { id: "service-points", label: "Service Points" },
  { id: "technicians", label: "Technicians" },
  { id: "merchants", label: "Merchants" },
  { id: "terminals", label: "Terminals" },
];
const PAGE_SIZE_OPTIONS = [5, 10, 15];

export function meta() {
  return [
    { title: "Work Clusters | EDC.OS" },
    {
      name: "description",
      content:
        "Cluster management workspace for service points, technicians, merchants, and terminals.",
    },
  ];
}

function StatusBadge({ status }: { status: WorkClusterStatus }) {
  const variantMap: Record<
    WorkClusterStatus,
    "success" | "warning" | "destructive"
  > = {
    Healthy: "success",
    Watch: "warning",
    Critical: "destructive",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-20 justify-center">
      {status}
    </Badge>
  );
}

function TerminalStatusBadge({ status }: { status: Terminal["status"] }) {
  const variantMap: Record<
    Terminal["status"],
    "success" | "warning" | "destructive"
  > = {
    Active: "success",
    Maintenance: "warning",
    Problem: "destructive",
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
}

function ServicePointStatusBadge({
  status,
}: {
  status: ServicePoint["status"];
}) {
  const variantMap: Record<
    ServicePoint["status"],
    "success" | "warning" | "destructive"
  > = {
    Online: "success",
    Degraded: "warning",
    Offline: "destructive",
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
  }[tone];

  return (
    <Card className="min-w-0">
      <CardContent className="px-4 py-3">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-foreground/60">
      {label}
    </div>
  );
}

function getInitialAssignments(clusters: WorkCluster[]): ClusterAssignment {
  return Object.fromEntries(
    clusters.map((cluster) => [cluster.id, cluster.servicePointIds]),
  );
}

function getInitialTechnicianMembers(clusters: WorkCluster[]) {
  return Object.fromEntries(
    clusters.map((cluster) => {
      const leaderServicePointId = cluster.leaderUsername
        ? TECHNICIAN_SERVICE_POINT_ASSIGNMENTS[cluster.leaderUsername]
        : undefined;
      const leaderInCluster =
        cluster.leaderUsername &&
        leaderServicePointId &&
        cluster.servicePointIds.includes(leaderServicePointId);

      return [
        cluster.id,
        leaderInCluster && cluster.leaderUsername
          ? [cluster.leaderUsername]
          : [],
      ];
    }),
  );
}

function getClusterStats(
  servicePoints: ServicePoint[],
  technicians: Technician[],
  technicianAssignments: Record<string, string>,
  merchants: Merchant[],
  terminals: Terminal[],
): ClusterStats {
  const servicePointIds = new Set(
    servicePoints.map((servicePoint) => servicePoint.id),
  );
  const assignedTechnicians = technicians.filter((technician) =>
    servicePointIds.has(technicianAssignments[technician.username]),
  );
  const assignedMerchants = merchants.filter((merchant) =>
    servicePointIds.has(merchant.servicePointId),
  );
  const assignedTerminals = terminals.filter((terminal) =>
    servicePointIds.has(terminal.servicePointId),
  );
  const openJobs = servicePoints.reduce(
    (total, servicePoint) => total + servicePoint.openJobs,
    0,
  );
  const averageLoad = servicePoints.length
    ? Math.round(
        servicePoints.reduce(
          (total, servicePoint) => total + servicePoint.load,
          0,
        ) / servicePoints.length,
      )
    : 0;
  const problemTerminals = assignedTerminals.filter(
    (terminal) => terminal.status === "Problem",
  ).length;
  const hasOfflineServicePoint = servicePoints.some(
    (servicePoint) => servicePoint.status === "Offline",
  );
  const hasDegradedServicePoint = servicePoints.some(
    (servicePoint) => servicePoint.status === "Degraded",
  );
  const status: WorkClusterStatus =
    !servicePoints.length ||
    hasOfflineServicePoint ||
    problemTerminals >= 2 ||
    averageLoad >= 90
      ? "Critical"
      : hasDegradedServicePoint || averageLoad >= 75 || openJobs >= 24
        ? "Watch"
        : "Healthy";

  return {
    activeTechnicians: assignedTechnicians.filter(
      (technician) => technician.active,
    ).length,
    inactiveTechnicians: assignedTechnicians.filter(
      (technician) => !technician.active,
    ).length,
    merchantCount: assignedMerchants.length,
    activeTerminals: assignedTerminals.filter(
      (terminal) => terminal.status === "Active",
    ).length,
    problemTerminals,
    maintenanceTerminals: assignedTerminals.filter(
      (terminal) => terminal.status === "Maintenance",
    ).length,
    openJobs,
    averageLoad,
    status,
  };
}

function getServicePointsForCluster(
  clusterId: string,
  assignments: ClusterAssignment,
  servicePointsById: Record<string, ServicePoint>,
) {
  return (assignments[clusterId] ?? [])
    .map((servicePointId) => servicePointsById[servicePointId])
    .filter(Boolean);
}

function getClusterId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `cluster-${slug || Date.now()}`;
}

function getPaginationItems(
  pageCount: number,
  currentPage: number,
): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pageSet = new Set<number>([1, pageCount, currentPage]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pageSet.add(page));
  } else if (currentPage >= pageCount - 3) {
    [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach(
      (page) => pageSet.add(page),
    );
  } else {
    [currentPage - 1, currentPage + 1].forEach((page) => pageSet.add(page));
  }

  const pages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return pages.flatMap<PaginationItem>((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      return ["ellipsis", page];
    }

    return [page];
  });
}

function getTechnicianServicePointId(
  technician: Technician,
  technicianAssignments: Record<string, string>,
) {
  return technicianAssignments[technician.username];
}

function CreateClusterDialog({
  open,
  regions,
  onClose,
  onCreate,
}: {
  open: boolean;
  regions: string[];
  onClose: () => void;
  onCreate: (cluster: WorkCluster) => void;
}) {
  const getDefaultFormValues = (): NewClusterForm => ({
    name: "",
    region: regions[0] ?? "New Region",
    leaderUsername:
      TECHNICIANS.find((technician) => technician.active)?.username ?? "",
    slaScore: "95",
    riskIndicator: "New cluster awaiting service point assignment",
  });
  const form = useForm({
    defaultValues: getDefaultFormValues(),
    onSubmit: ({ value }) => {
      const name = value.name.trim();
    if (!name) return;

    onCreate({
      id: getClusterId(name),
      name,
        region: value.region.trim() || "New Region",
      status: "Watch",
        leaderUsername: value.leaderUsername || undefined,
        slaScore: Number(value.slaScore) || 95,
      load: 0,
      riskIndicator:
          value.riskIndicator.trim() ||
        "New cluster awaiting service point assignment",
      servicePointIds: [],
    });
      form.reset(getDefaultFormValues());
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultFormValues());
    }
  }, [open, regions]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}
    >
      <DialogContent className="max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Work Cluster
            </p>
            <DialogTitle>Create New Cluster</DialogTitle>
            <DialogDescription>
              Create an empty cluster, then assign service points from the
              detail panel.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Cluster name
              </span>
              <form.Field name="name">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Cluster Java North"
                    data-testid="new-cluster-name"
                  />
                )}
              </form.Field>
            </label>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Region
                </span>
                <form.Field name="region">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      data-testid="new-cluster-region"
                    >
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                      <option value="New Region">New Region</option>
                    </Select>
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  SLA
                </span>
                <form.Field name="slaScore">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      inputMode="numeric"
                      data-testid="new-cluster-sla"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Cluster leader
              </span>
              <form.Field name="leaderUsername">
                {(field) => (
                  <Select
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.value)
                    }
                    data-testid="new-cluster-leader"
                  >
                    <option value="">Choose leader</option>
                    {TECHNICIANS.filter((technician) => technician.active).map(
                      (technician) => (
                        <option
                          key={technician.username}
                          value={technician.username}
                        >
                          {technician.fullName} - {technician.department}
                        </option>
                      ),
                    )}
                  </Select>
                )}
              </form.Field>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Risk note
              </span>
              <form.Field name="riskIndicator">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Operational note"
                    data-testid="new-cluster-risk"
                  />
                )}
              </form.Field>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.values.name}>
              {(name) => (
                <Button type="submit" disabled={!name.trim()}>
                  Create Cluster
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddClusterItemDialog({
  open,
  type,
  servicePoints,
  availableTechnicians,
  availableMerchants,
  availableTerminals,
  merchantById,
  servicePointsById,
  technicianAssignments,
  onClose,
  onLinkMerchant,
  onLinkTerminal,
  onLinkTechnician,
}: {
  open: boolean;
  type: AddClusterItemType | null;
  servicePoints: ServicePoint[];
  availableTechnicians: Technician[];
  availableMerchants: Merchant[];
  availableTerminals: Terminal[];
  merchantById: Record<string, Merchant>;
  servicePointsById: Record<string, ServicePoint>;
  technicianAssignments: Record<string, string>;
  onClose: () => void;
  onLinkMerchant: (merchantId: string, servicePointId: string) => void;
  onLinkTerminal: (terminalId: string, servicePointId: string) => void;
  onLinkTechnician: (username: string) => void;
}) {
  const defaultServicePoint = servicePoints[0];
  const form = useForm({
    defaultValues: {
      merchantSearch: "",
      terminalSearch: "",
      technicianSearch: "",
    },
    onSubmit: () => undefined,
  });
  const searchValues = useStore(form.store, (state) => state.values);

  useEffect(() => {
    if (!open) return;

    form.reset({
      merchantSearch: "",
      terminalSearch: "",
      technicianSearch: "",
    });
  }, [open]);

  const dialogCopy = {
    merchant: {
      label: "Merchant",
      title: "Add Merchant",
      description: "Pilih merchant dari list dan link ke cluster ini.",
    },
    terminal: {
      label: "Terminal",
      title: "Add Terminal",
      description: "Pilih terminal dari list dan link ke cluster ini.",
    },
    technician: {
      label: "Technician Members",
      title: "Add Members",
      description:
        "Pilih teknisi aktif dari service point yang ada di cluster ini.",
    },
  };
  const copy = type ? dialogCopy[type] : dialogCopy.merchant;
  const filteredMerchants = useMemo(() => {
    const keyword = searchValues.merchantSearch.trim().toLowerCase();

    if (!keyword) return availableMerchants;

    return availableMerchants.filter((merchant) => {
      const servicePoint = servicePointsById[merchant.servicePointId];

      return [
        merchant.name,
        merchant.city,
        merchant.segment,
        servicePoint?.name,
        servicePoint?.city,
        servicePoint?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [availableMerchants, searchValues.merchantSearch, servicePointsById]);
  const filteredTerminals = useMemo(() => {
    const keyword = searchValues.terminalSearch.trim().toLowerCase();

    if (!keyword) return availableTerminals;

    return availableTerminals.filter((terminal) => {
      const merchant = merchantById[terminal.merchantId];
      const servicePoint = servicePointsById[terminal.servicePointId];

      return [
        terminal.tid,
        terminal.model,
        terminal.status,
        terminal.lastSignal,
        merchant?.name,
        servicePoint?.name,
        servicePoint?.city,
        servicePoint?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [
    availableTerminals,
    merchantById,
    servicePointsById,
    searchValues.terminalSearch,
  ]);
  const filteredTechnicians = useMemo(() => {
    const keyword = searchValues.technicianSearch.trim().toLowerCase();

    if (!keyword) return availableTechnicians;

    return availableTechnicians.filter((technician) => {
      const servicePoint =
        servicePointsById[technicianAssignments[technician.username]];

      return [
        technician.fullName,
        technician.username,
        technician.department,
        servicePoint?.name,
        servicePoint?.city,
        servicePoint?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [
    availableTechnicians,
    servicePointsById,
    technicianAssignments,
    searchValues.technicianSearch,
  ]);

  const submitItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  };

  if (!type) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}
    >
      <DialogContent className="max-w-xl">
        <form onSubmit={submitItem}>
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              {copy.label}
            </p>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-5">
            {type === "merchant" ? (
              <>
                {availableMerchants.length ? (
                  <div className="space-y-3">
                    <label className="relative block min-w-0">
                      <span className="sr-only">Filter merchant</span>
                      <LuSearch
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                        strokeWidth={1.75}
                      />
                      <form.Field name="merchantSearch">
                        {(field) => (
                          <Input
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Filter merchant, city, service point..."
                            className="pl-9"
                            data-testid="filter-merchant-members"
                          />
                        )}
                      </form.Field>
                    </label>

                    <div className="max-h-[24.5rem] space-y-2 overflow-y-auto pr-1">
                      {filteredMerchants.length ? (
                        filteredMerchants.map((merchant) => {
                          const servicePoint =
                            servicePointsById[merchant.servicePointId];

                          return (
                            <div
                              key={merchant.id}
                              className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">
                                  {merchant.name}
                                </p>
                                <p className="mt-1 truncate text-xs text-foreground/55">
                                  {merchant.city} - {merchant.segment}
                                </p>
                                <p className="mt-1 truncate text-xs text-foreground/45">
                                  {servicePoint?.name ?? "Unassigned"}
                                </p>
                              </div>
                              <Button
                                onClick={() =>
                                  defaultServicePoint
                                    ? onLinkMerchant(
                                        merchant.id,
                                        defaultServicePoint.id,
                                      )
                                    : undefined
                                }
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                data-testid={`link-merchant-${merchant.id}`}
                              >
                                Add
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <EmptyState label="No merchants match your filter." />
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState label="All merchants are already linked to this cluster." />
                )}
              </>
            ) : null}

            {type === "terminal" ? (
              <>
                {availableTerminals.length ? (
                  <div className="space-y-3">
                    <label className="relative block min-w-0">
                      <span className="sr-only">Filter terminal</span>
                      <LuSearch
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                        strokeWidth={1.75}
                      />
                      <form.Field name="terminalSearch">
                        {(field) => (
                          <Input
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Filter TID, model, merchant..."
                            className="pl-9"
                            data-testid="filter-terminal-members"
                          />
                        )}
                      </form.Field>
                    </label>

                    <div className="max-h-[24.5rem] space-y-2 overflow-y-auto pr-1">
                      {filteredTerminals.length ? (
                        filteredTerminals.map((terminal) => {
                          const merchant = merchantById[terminal.merchantId];
                          const servicePoint =
                            servicePointsById[terminal.servicePointId];

                          return (
                            <div
                              key={terminal.id}
                              className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">
                                    {terminal.tid}
                                  </p>
                                  <TerminalStatusBadge
                                    status={terminal.status}
                                  />
                                </div>
                                <p className="mt-1 truncate text-xs text-foreground/55">
                                  {merchant?.name ?? terminal.merchantId} -{" "}
                                  {terminal.model}
                                </p>
                                <p className="mt-1 truncate text-xs text-foreground/45">
                                  {servicePoint?.name ?? "Unassigned"}
                                </p>
                              </div>
                              <Button
                                onClick={() =>
                                  defaultServicePoint
                                    ? onLinkTerminal(
                                        terminal.id,
                                        defaultServicePoint.id,
                                      )
                                    : undefined
                                }
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                data-testid={`link-terminal-${terminal.id}`}
                              >
                                Add
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <EmptyState label="No terminals match your filter." />
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState label="All terminals are already linked to this cluster." />
                )}
              </>
            ) : null}

            {type === "technician" ? (
              <>
                {availableTechnicians.length ? (
                  <div className="space-y-3">
                    <label className="relative block min-w-0">
                      <span className="sr-only">Filter teknisi</span>
                      <LuSearch
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                        strokeWidth={1.75}
                      />
                      <form.Field name="technicianSearch">
                        {(field) => (
                          <Input
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Filter nama, username, service point..."
                            className="pl-9"
                            data-testid="filter-technician-members"
                          />
                        )}
                      </form.Field>
                    </label>

                    <div className="max-h-[24.5rem] space-y-2 overflow-y-auto pr-1">
                      {filteredTechnicians.length ? (
                        filteredTechnicians.map((technician) => {
                          const servicePoint =
                            servicePointsById[
                              technicianAssignments[technician.username]
                            ];

                          return (
                            <div
                              key={technician.username}
                              className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">
                                  {technician.fullName}
                                </p>
                                <p className="mt-1 truncate text-xs text-foreground/55">
                                  @{technician.username} -{" "}
                                  {servicePoint?.name ?? "Unassigned"}
                                </p>
                              </div>
                              <Button
                                onClick={() =>
                                  onLinkTechnician(technician.username)
                                }
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                data-testid={`link-technician-${technician.username}`}
                              >
                                Add
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <EmptyState label="No technicians match your filter." />
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState label="All active technicians from this cluster's service points are already linked." />
                )}
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkClusters() {
  const [clusters, setClusters] = useState<WorkCluster[]>(WORK_CLUSTERS);
  const [merchants, setMerchants] = useState<Merchant[]>(MERCHANTS);
  const [terminals, setTerminals] = useState<Terminal[]>(TERMINALS);
  const [technicianAssignments, setTechnicianAssignments] = useState<
    Record<string, string>
  >(TECHNICIAN_SERVICE_POINT_ASSIGNMENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedClusterId, setSelectedClusterId] = useState(
    WORK_CLUSTERS[0]?.id,
  );
  const [activeTab, setActiveTab] = useState<DetailTab>("service-points");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addItemType, setAddItemType] = useState<AddClusterItemType | null>(
    null,
  );
  const [clusterAssignments, setClusterAssignments] =
    useState<ClusterAssignment>(() => getInitialAssignments(WORK_CLUSTERS));
  const [clusterTechnicianMembers, setClusterTechnicianMembers] =
    useState<ClusterAssignment>(() =>
      getInitialTechnicianMembers(WORK_CLUSTERS),
    );

  const servicePointsById = useMemo(
    () =>
      Object.fromEntries(
        SERVICE_POINTS.map((servicePoint) => [servicePoint.id, servicePoint]),
      ) as Record<string, ServicePoint>,
    [],
  );
  const merchantById = useMemo(
    () =>
      Object.fromEntries(
        merchants.map((merchant) => [merchant.id, merchant]),
      ) as Record<string, Merchant>,
    [merchants],
  );
  const regions = useMemo(
    () => Array.from(new Set(clusters.map((cluster) => cluster.region))).sort(),
    [clusters],
  );

  const enrichedClusters = useMemo(
    () =>
      clusters.map((cluster) => {
        const servicePoints = getServicePointsForCluster(
          cluster.id,
          clusterAssignments,
          servicePointsById,
        );

        return {
          ...cluster,
          stats: getClusterStats(
            servicePoints,
            TECHNICIANS.filter((technician) =>
              (clusterTechnicianMembers[cluster.id] ?? []).includes(
                technician.username,
              ),
            ),
            technicianAssignments,
            merchants,
            terminals,
          ),
          servicePointCount: servicePoints.length,
        };
      }),
    [
      clusterAssignments,
      clusterTechnicianMembers,
      clusters,
      merchants,
      servicePointsById,
      technicianAssignments,
      terminals,
    ],
  );

  const filteredClusters = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return enrichedClusters.filter((cluster) => {
      const matchesSearch = keyword
        ? [cluster.name, cluster.region, cluster.riskIndicator, cluster.status]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
        : true;
      const matchesStatus =
        statusFilter === "all" || cluster.stats.status === statusFilter;
      const matchesRegion =
        regionFilter === "all" || cluster.region === regionFilter;

      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [enrichedClusters, regionFilter, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredClusters.length / pageSize));
  const currentPage = Math.min(pageIndex + 1, pageCount);
  const paginationItems = useMemo(
    () => getPaginationItems(pageCount, currentPage),
    [currentPage, pageCount],
  );
  const paginatedClusters = useMemo(() => {
    const start = pageIndex * pageSize;

    return filteredClusters.slice(start, start + pageSize);
  }, [filteredClusters, pageIndex, pageSize]);
  const visibleStart = filteredClusters.length ? pageIndex * pageSize + 1 : 0;
  const visibleEnd = Math.min(
    (pageIndex + 1) * pageSize,
    filteredClusters.length,
  );

  useEffect(() => {
    setPageIndex(0);
  }, [pageSize, regionFilter, search, statusFilter]);

  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(pageCount - 1);
    }
  }, [pageCount, pageIndex]);

  const selectedCluster =
    enrichedClusters.find((cluster) => cluster.id === selectedClusterId) ??
    enrichedClusters[0];
  const selectedServicePoints = selectedCluster
    ? getServicePointsForCluster(
        selectedCluster.id,
        clusterAssignments,
        servicePointsById,
      )
    : [];
  const selectedServicePointIds = new Set(
    selectedServicePoints.map((servicePoint) => servicePoint.id),
  );
  const selectedTechnicianUsernames = new Set(
    selectedCluster ? (clusterTechnicianMembers[selectedCluster.id] ?? []) : [],
  );
  const selectedTechnicians = TECHNICIANS.filter(
    (technician) =>
      selectedTechnicianUsernames.has(technician.username) &&
      selectedServicePointIds.has(technicianAssignments[technician.username]),
  );
  const selectedLeader = selectedCluster?.leaderUsername
    ? TECHNICIANS.find(
        (technician) => technician.username === selectedCluster.leaderUsername,
      )
    : undefined;
  const activeClusterTechnicians = selectedTechnicians.filter(
    (technician) => technician.active,
  );
  const leaderOptions = activeClusterTechnicians.length
    ? activeClusterTechnicians
    : TECHNICIANS.filter((technician) => technician.active);
  const selectedMerchants = merchants.filter((merchant) =>
    selectedServicePointIds.has(merchant.servicePointId),
  );
  const selectedTerminals = terminals.filter((terminal) =>
    selectedServicePointIds.has(terminal.servicePointId),
  );
  const availableTechniciansForCluster = TECHNICIANS.filter(
    (technician) =>
      technician.active &&
      selectedServicePointIds.has(technicianAssignments[technician.username]) &&
      !selectedTechnicianUsernames.has(technician.username),
  );
  const availableMerchantsForCluster = merchants.filter(
    (merchant) => !selectedServicePointIds.has(merchant.servicePointId),
  );
  const availableTerminalsForCluster = terminals.filter(
    (terminal) => !selectedServicePointIds.has(terminal.servicePointId),
  );
  const assignedServicePointIds = new Set(
    Object.values(clusterAssignments).flat(),
  );
  const availableServicePoints = SERVICE_POINTS.filter(
    (servicePoint) => !assignedServicePointIds.has(servicePoint.id),
  );
  const overloadedClusters = enrichedClusters.filter(
    (cluster) => cluster.stats.status !== "Healthy",
  ).length;
  const terminalRisk = enrichedClusters.reduce(
    (total, cluster) => total + cluster.stats.problemTerminals,
    0,
  );
  const unmappedServicePoints =
    SERVICE_POINTS.length - assignedServicePointIds.size;

  const createCluster = (cluster: WorkCluster) => {
    const existingIds = new Set(clusters.map((item) => item.id));
    const id = existingIds.has(cluster.id)
      ? `${cluster.id}-${clusters.length + 1}`
      : cluster.id;
    const nextCluster = { ...cluster, id };

    setClusters((current) => [...current, nextCluster]);
    setClusterAssignments((current) => ({ ...current, [id]: [] }));
    setClusterTechnicianMembers((current) => ({ ...current, [id]: [] }));
    setSelectedClusterId(id);
    setActiveTab("service-points");
    setCreateDialogOpen(false);
  };

  const changeClusterLeader = (leaderUsername: string) => {
    if (!selectedCluster) return;

    setClusters((current) =>
      current.map((cluster) =>
        cluster.id === selectedCluster.id
          ? { ...cluster, leaderUsername: leaderUsername || undefined }
          : cluster,
      ),
    );
  };

  const assignServicePoint = (servicePointId: string) => {
    if (!selectedCluster || !servicePointId) return;

    setClusterAssignments((current) => ({
      ...current,
      [selectedCluster.id]: [
        ...(current[selectedCluster.id] ?? []),
        servicePointId,
      ],
    }));
  };

  const unassignServicePoint = (servicePointId: string) => {
    if (!selectedCluster) return;

    setClusterAssignments((current) => ({
      ...current,
      [selectedCluster.id]: (current[selectedCluster.id] ?? []).filter(
        (assignedServicePointId) => assignedServicePointId !== servicePointId,
      ),
    }));
  };

  const linkMerchantToCluster = (
    merchantId: string,
    servicePointId: string,
  ) => {
    setMerchants((current) =>
      current.map((merchant) =>
        merchant.id === merchantId ? { ...merchant, servicePointId } : merchant,
      ),
    );
    setActiveTab("merchants");
  };

  const linkTerminalToCluster = (
    terminalId: string,
    servicePointId: string,
  ) => {
    setTerminals((current) =>
      current.map((terminal) =>
        terminal.id === terminalId ? { ...terminal, servicePointId } : terminal,
      ),
    );
    setActiveTab("terminals");
  };

  const linkTechnicianToCluster = (username: string) => {
    if (!selectedCluster) return;

    setClusterTechnicianMembers((current) => ({
      ...current,
      [selectedCluster.id]: Array.from(
        new Set([...(current[selectedCluster.id] ?? []), username]),
      ),
    }));
    setActiveTab("technicians");
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="work-clusters-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Field Operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Work Clusters
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground/60">
            Balance cluster coverage across service points, technicians,
            merchants, terminals, and open jobs from one operational workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[34rem]">
          <MetricTile label="Clusters" value={clusters.length} />
          <MetricTile
            label="Overloaded"
            value={overloadedClusters}
            tone={overloadedClusters ? "warning" : "good"}
          />
          <MetricTile
            label="Unmapped SP"
            value={unmappedServicePoints}
            tone={unmappedServicePoints ? "warning" : "good"}
          />
          <MetricTile
            label="Terminal Risk"
            value={terminalRisk}
            tone={terminalRisk ? "danger" : "good"}
          />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)]">
        <Card className="min-w-0 overflow-hidden rounded-xl">
          <div className="grid gap-4 border-b border-border p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
                <LuMapPinned className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  Cluster List
                </h2>
                <p className="text-xs text-foreground/60">
                  Showing {visibleStart}-{visibleEnd} of{" "}
                  {filteredClusters.length} matching clusters
                </p>
              </div>
            </div>

            <div className="grid min-w-0 gap-2 sm:grid-cols-2 2xl:grid-cols-[minmax(14rem,1fr)_minmax(9rem,12rem)_minmax(9rem,12rem)_auto]">
              <label className="relative block min-w-0">
                <span className="sr-only">Search clusters</span>
                <LuSearch
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                  strokeWidth={1.75}
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search cluster, region, risk..."
                  className="pl-9"
                  data-testid="cluster-search-input"
                />
              </label>
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                data-testid="cluster-status-filter"
              >
                <option value="all">All status</option>
                <option value="Healthy">Healthy</option>
                <option value="Watch">Watch</option>
                <option value="Critical">Critical</option>
              </Select>
              <Select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                aria-label="Filter by region"
                data-testid="cluster-region-filter"
              >
                <option value="all">All regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </Select>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="w-full 2xl:w-auto"
                data-testid="create-new-cluster-button"
              >
                <LuPlus className="h-4 w-4" strokeWidth={1.75} />
                Create New Cluster
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[62rem]">
              <TableHeader>
                <TableRow className="hover:bg-background">
                  <TableHead>Cluster</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead>SP</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Open Jobs</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClusters.length ? (
                  paginatedClusters.map((cluster) => (
                    <TableRow
                      key={cluster.id}
                      className={
                        selectedCluster?.id === cluster.id
                          ? "bg-accent/5 hover:bg-accent/5"
                          : undefined
                      }
                    >
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setSelectedClusterId(cluster.id)}
                          className="flex w-full min-w-0 items-center gap-3 text-left"
                          data-testid={`select-cluster-${cluster.id}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
                            <LuMapPin className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">
                              {cluster.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-foreground/55">
                              {cluster.region}
                            </span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={cluster.stats.status} />
                      </TableCell>
                      <TableCell className="max-w-[13rem]">
                        {cluster.leaderUsername ? (
                          <span className="block truncate font-medium text-foreground">
                            {
                              TECHNICIANS.find(
                                (technician) =>
                                  technician.username ===
                                  cluster.leaderUsername,
                              )?.fullName
                            }
                          </span>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">
                          {cluster.servicePointCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">
                          {cluster.stats.averageLoad}%
                        </span>
                      </TableCell>
                      <TableCell>{cluster.slaScore}%</TableCell>
                      <TableCell>{cluster.stats.openJobs}</TableCell>
                      <TableCell className="max-w-[16rem]">
                        <span className="line-clamp-2 text-xs leading-5">
                          {cluster.riskIndicator}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm text-foreground/60"
                    >
                      No clusters match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="text-sm text-foreground/60">
                Page{" "}
                <span className="font-semibold text-foreground">
                  {filteredClusters.length ? currentPage : 0}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {filteredClusters.length ? pageCount : 0}
                </span>
              </p>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground/65">
                Rows/page
                <Select
                  value={String(pageSize)}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-9 w-24"
                  data-testid="cluster-page-size"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="flex max-w-full items-center gap-2 overflow-x-auto">
              <Button
                aria-label="First page"
                disabled={pageIndex === 0 || !filteredClusters.length}
                onClick={() => setPageIndex(0)}
                variant="outline"
                size="icon"
              >
                <LuChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <Button
                aria-label="Previous page"
                disabled={pageIndex === 0 || !filteredClusters.length}
                onClick={() =>
                  setPageIndex((current) => Math.max(0, current - 1))
                }
                variant="outline"
                size="icon"
              >
                <LuChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <div
                className="flex items-center gap-1"
                aria-label="Pagination pages"
              >
                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex h-9 w-9 items-center justify-center text-sm font-semibold text-foreground/40"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={item}
                      aria-current={item === currentPage ? "page" : undefined}
                      onClick={() => setPageIndex(item - 1)}
                      variant={item === currentPage ? "default" : "outline"}
                      size="icon"
                      className="min-w-9 px-3"
                    >
                      {item}
                    </Button>
                  ),
                )}
              </div>
              <Button
                aria-label="Next page"
                disabled={
                  pageIndex >= pageCount - 1 || !filteredClusters.length
                }
                onClick={() =>
                  setPageIndex((current) =>
                    Math.min(pageCount - 1, current + 1),
                  )
                }
                variant="outline"
                size="icon"
              >
                <LuChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <Button
                aria-label="Last page"
                disabled={
                  pageIndex >= pageCount - 1 || !filteredClusters.length
                }
                onClick={() => setPageIndex(pageCount - 1)}
                variant="outline"
                size="icon"
              >
                <LuChevronsRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </Card>

        {selectedCluster ? (
          <Card className="min-w-0 overflow-hidden rounded-xl">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      Cluster Detail
                    </p>
                    <StatusBadge status={selectedCluster.stats.status} />
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {selectedCluster.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/60">
                    <LuMapPin
                      className="h-4 w-4 shrink-0 text-accent"
                      strokeWidth={1.75}
                    />
                    {selectedCluster.region}
                  </p>
                  <div className="mt-3 rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-2">
                      <LuCrown
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                          Cluster Leader
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-foreground">
                          {selectedLeader?.fullName ?? "Unassigned"}
                        </p>
                        {selectedLeader ? (
                          <p className="mt-0.5 truncate text-xs text-foreground/55">
                            @{selectedLeader.username} -{" "}
                            {selectedLeader.department}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-44">
                  <div className="rounded-lg bg-background px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                      SLA
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {selectedCluster.slaScore}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-background px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                      Load
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {selectedCluster.stats.averageLoad}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-background px-3 py-2">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                    <LuUsers
                      className="h-3 w-3 text-accent"
                      strokeWidth={1.75}
                    />
                    Tech
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {selectedCluster.stats.activeTechnicians}
                  </p>
                </div>
                <div className="rounded-lg bg-background px-3 py-2">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                    <LuStore
                      className="h-3 w-3 text-accent"
                      strokeWidth={1.75}
                    />
                    Merchant
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {selectedCluster.stats.merchantCount}
                  </p>
                </div>
                <div className="rounded-lg bg-background px-3 py-2">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                    <LuCpu className="h-3 w-3 text-accent" strokeWidth={1.75} />
                    Terminal
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {selectedCluster.stats.activeTerminals}
                  </p>
                </div>
                <div className="rounded-lg bg-background px-3 py-2">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                    <LuTriangleAlert
                      className="h-3 w-3 text-accent"
                      strokeWidth={1.75}
                    />
                    Risk
                  </p>
                  <p className="mt-1 text-sm font-bold text-rose-700">
                    {selectedCluster.stats.problemTerminals}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-border p-4">
              <div className="flex max-w-full gap-2 overflow-x-auto">
                {detailTabs.map((tab) => (
                  <Button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    data-testid={`cluster-tab-${tab.id}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="max-h-[38rem] overflow-y-auto p-5">
              {activeTab === "service-points" ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-foreground/65">
                      Cluster leader
                    </label>
                    <Select
                      value={selectedCluster.leaderUsername ?? ""}
                      onChange={(event) =>
                        changeClusterLeader(event.target.value)
                      }
                      data-testid="cluster-leader-select"
                    >
                      <option value="">Unassigned leader</option>
                      {leaderOptions.map((technician) => {
                        const servicePoint =
                          servicePointsById[
                            getTechnicianServicePointId(
                              technician,
                              technicianAssignments,
                            )
                          ];

                        return (
                          <option
                            key={technician.username}
                            value={technician.username}
                          >
                            {technician.fullName} -{" "}
                            {servicePoint?.name ?? technician.department}
                          </option>
                        );
                      })}
                    </Select>
                    <p className="mt-2 text-xs leading-5 text-foreground/55">
                      Opsi utama diambil dari teknisi pada Service Point
                      cluster. Jika cluster belum punya Service Point, semua
                      teknisi aktif tersedia.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-foreground/65">
                      Assign available service point
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select
                        aria-label="Available service points"
                        className="min-w-0 flex-1"
                        data-testid="available-service-point-select"
                        onChange={(event) => {
                          assignServicePoint(event.target.value);
                          event.currentTarget.value = "";
                        }}
                        defaultValue=""
                        disabled={!availableServicePoints.length}
                      >
                        <option value="">
                          {availableServicePoints.length
                            ? "Choose service point"
                            : "No available service point"}
                        </option>
                        {availableServicePoints.map((servicePoint) => (
                          <option key={servicePoint.id} value={servicePoint.id}>
                            {servicePoint.name} - {servicePoint.region}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {selectedServicePoints.length ? (
                    <div className="space-y-3">
                      {selectedServicePoints.map((servicePoint) => (
                        <div
                          key={servicePoint.id}
                          className="rounded-lg border border-border bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-foreground">
                                  {servicePoint.name}
                                </h3>
                                <ServicePointStatusBadge
                                  status={servicePoint.status}
                                />
                              </div>
                              <p className="mt-1 text-sm text-foreground/60">
                                {servicePoint.city} - {servicePoint.address}
                              </p>
                            </div>
                            <Button
                              onClick={() =>
                                unassignServicePoint(servicePoint.id)
                              }
                              variant="outline"
                              size="sm"
                            >
                              <LuMinus
                                className="h-3.5 w-3.5"
                                strokeWidth={2}
                              />
                              Unassign
                            </Button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-md bg-background px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                                Load
                              </p>
                              <p className="mt-1 text-sm font-bold text-foreground">
                                {servicePoint.load}%
                              </p>
                            </div>
                            <div className="rounded-md bg-background px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                                Jobs
                              </p>
                              <p className="mt-1 text-sm font-bold text-foreground">
                                {servicePoint.openJobs}
                              </p>
                            </div>
                            <div className="rounded-md bg-background px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                                Tech
                              </p>
                              <p className="mt-1 text-sm font-bold text-foreground">
                                {servicePoint.technicianCount}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState label="No service points assigned to this cluster." />
                  )}
                </div>
              ) : null}

              {activeTab === "technicians" ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Technician Members
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/55">
                        {selectedTechnicians.length} teknisi terhubung ke
                        cluster ini
                      </p>
                    </div>
                    <Button
                      onClick={() => setAddItemType("technician")}
                      disabled={
                        !selectedServicePoints.length ||
                        !availableTechniciansForCluster.length
                      }
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      data-testid="add-technician-button"
                    >
                      <LuUsers className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Add Member
                    </Button>
                  </div>

                  {selectedTechnicians.length ? (
                    selectedTechnicians.map((technician) => {
                      const servicePoint =
                        servicePointsById[
                          technicianAssignments[technician.username]
                        ];

                      return (
                        <div
                          key={technician.username}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {technician.fullName}
                            </p>
                            <p className="mt-1 truncate text-xs text-foreground/55">
                              @{technician.username} - {servicePoint?.name}
                            </p>
                          </div>
                          <Badge
                            variant={
                              technician.active ? "success" : "destructive"
                            }
                          >
                            {technician.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState label="No technicians mapped through these service points." />
                  )}
                </div>
              ) : null}

              {activeTab === "merchants" ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Merchant Members
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/55">
                        {selectedMerchants.length} merchant terhubung ke cluster
                        ini
                      </p>
                    </div>
                    <Button
                      onClick={() => setAddItemType("merchant")}
                      disabled={
                        !selectedServicePoints.length ||
                        !availableMerchantsForCluster.length
                      }
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      data-testid="add-merchant-button"
                    >
                      <LuStore className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Add Merchant
                    </Button>
                  </div>

                  {selectedMerchants.length ? (
                    selectedMerchants.map((merchant) => (
                      <div
                        key={merchant.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {merchant.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-foreground/55">
                            {merchant.city} - {merchant.segment}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
                          <LuRadio className="h-3.5 w-3.5 text-accent" />
                          {merchant.activeTerminalCount}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState label="No merchants mapped through these service points." />
                  )}
                </div>
              ) : null}

              {activeTab === "terminals" ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Terminal Members
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/55">
                        {selectedTerminals.length} terminal terhubung ke cluster
                        ini
                      </p>
                    </div>
                    <Button
                      onClick={() => setAddItemType("terminal")}
                      disabled={
                        !selectedServicePoints.length ||
                        !availableTerminalsForCluster.length
                      }
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      data-testid="add-terminal-button"
                    >
                      <LuCpu className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Add Terminal
                    </Button>
                  </div>

                  {selectedTerminals.length ? (
                    selectedTerminals.map((terminal) => {
                      const merchant = merchantById[terminal.merchantId];

                      return (
                        <div
                          key={terminal.id}
                          className="rounded-lg border border-border bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">
                                  {terminal.tid}
                                </p>
                                <TerminalStatusBadge status={terminal.status} />
                              </div>
                              <p className="mt-1 truncate text-xs text-foreground/55">
                                {merchant?.name} - {terminal.model}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
                              <LuActivity
                                className="h-3.5 w-3.5 text-accent"
                                strokeWidth={1.75}
                              />
                              {terminal.lastSignal}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState label="No terminals mapped through these service points." />
                  )}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
            <LuChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              Business Flow
            </h2>
            <p className="mt-1 text-sm leading-6 text-foreground/60">
              Cluster aggregates service point performance. Technicians are
              mapped to service points, merchants are served by service points,
              terminals are linked to merchants and service points, and cluster
              health is calculated from coverage, terminal risk, open jobs, and
              field load.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {[
                { icon: LuMapPinned, label: "Cluster" },
                { icon: LuBriefcaseBusiness, label: "Service Point" },
                { icon: LuUsers, label: "Technician" },
                { icon: LuCheck, label: "Merchant & Terminal" },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  >
                    <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <CreateClusterDialog
        open={createDialogOpen}
        regions={regions}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={createCluster}
      />
      <AddClusterItemDialog
        open={Boolean(addItemType)}
        type={addItemType}
        servicePoints={selectedServicePoints}
        availableTechnicians={availableTechniciansForCluster}
        availableMerchants={availableMerchantsForCluster}
        availableTerminals={availableTerminalsForCluster}
        merchantById={merchantById}
        servicePointsById={servicePointsById}
        technicianAssignments={technicianAssignments}
        onClose={() => setAddItemType(null)}
        onLinkMerchant={linkMerchantToCluster}
        onLinkTerminal={linkTerminalToCluster}
        onLinkTechnician={linkTechnicianToCluster}
      />
    </div>
  );
}
