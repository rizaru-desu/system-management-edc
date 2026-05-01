import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  LuBadgeCheck,
  LuBuilding2,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuCircleDot,
  LuCreditCard,
  LuMapPin,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
  LuStore,
  LuUserRound,
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
import { MERCHANTS, SERVICE_POINTS, TERMINALS } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type { Merchant, ServicePoint } from "~/data/mockData";

type MerchantSegment = Merchant["segment"];
type MerchantStatus = Merchant["status"];
type PaginationItem = number | "ellipsis";
type MerchantFormValues = {
  mid: string;
  name: string;
  brandName: string;
  segment: MerchantSegment;
  status: MerchantStatus;
  servicePointId: string;
  region: string;
  city: string;
  address: string;
  picName: string;
  picPhone: string;
  picEmail: string;
};
type MerchantRow = Merchant & {
  servicePointCode: string;
  servicePointName: string;
  activeTerminals: number;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const merchantSegments: MerchantSegment[] = [
  "Retail",
  "Banking",
  "Fuel",
  "Grocery",
  "Hospitality",
];
const merchantStatuses: MerchantStatus[] = [
  "Active",
  "Inactive",
  "Under Review",
];

export function meta() {
  return [
    { title: "Merchant Directory | EDC.OS" },
    {
      name: "description",
      content: "Merchant outlet master data and service point coverage workspace.",
    },
  ];
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

function getPinnedColumnStyles(column: Column<MerchantRow>): CSSProperties {
  const isPinned = column.getIsPinned();
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    background: isPinned ? "#fff" : undefined,
    boxShadow: isFirstRightPinnedColumn
      ? "4px 0 8px -6px rgba(14, 39, 72, 0.65) inset"
      : undefined,
    minWidth: column.columnDef.size,
    opacity: isPinned ? 0.98 : 1,
    position: isPinned ? "sticky" : "relative",
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    width: column.columnDef.size,
    zIndex: isPinned ? 10 : 0,
  };
}

function IconPageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      variant="outline"
      size="icon"
    >
      {children}
    </Button>
  );
}

function RowsPerPageDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="relative block min-w-36">
      <LuSlidersHorizontal
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
        strokeWidth={1.75}
      />
      <span className="sr-only">Rows per page</span>
      <Select
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full pl-9"
        data-testid="merchant-page-size"
      >
        {PAGE_SIZE_OPTIONS.map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            Rows {pageSize}
          </option>
        ))}
      </Select>
    </label>
  );
}

function StatusBadge({ status }: { status: MerchantStatus }) {
  const variantMap: Record<
    MerchantStatus,
    "success" | "warning" | "secondary"
  > = {
    Active: "success",
    Inactive: "secondary",
    "Under Review": "warning",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: IconType;
  tone?: "default" | "good" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-700",
    warning: "text-amber-700",
  }[tone];

  return (
    <Card className="min-w-0">
      <CardContent className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
          <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background/45 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-accent">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        {title}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function getServicePointMap(servicePoints: ServicePoint[]) {
  return Object.fromEntries(
    servicePoints.map((servicePoint) => [servicePoint.id, servicePoint]),
  );
}

function getActiveTerminalCount(merchantId: string) {
  return TERMINALS.filter(
    (terminal) =>
      terminal.merchantId === merchantId && terminal.status === "Active",
  ).length;
}

function getNextMerchantMid(merchants: Merchant[]) {
  const year = new Date().getFullYear();
  const nextSequence =
    merchants.reduce((highest, merchant) => {
      const match = merchant.mid.match(/^MID-(\d{4})-(\d+)$/);

      if (!match || Number(match[1]) !== year) return highest;

      return Math.max(highest, Number(match[2]));
    }, 0) + 1;

  return `MID-${year}-${String(nextSequence).padStart(4, "0")}`;
}

function getMerchantId(mid: string, name: string, existingIds: Set<string>) {
  const slug = (mid || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `m-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function getMerchantFormValues(
  merchant: Merchant | undefined,
  generatedMid: string,
): MerchantFormValues {
  return {
    mid: merchant?.mid ?? generatedMid,
    name: merchant?.name ?? "",
    brandName: merchant?.brandName ?? "",
    segment: merchant?.segment ?? "Retail",
    status: merchant?.status ?? "Active",
    servicePointId: merchant?.servicePointId ?? SERVICE_POINTS[0]?.id ?? "",
    region: merchant?.region ?? SERVICE_POINTS[0]?.region ?? "",
    city: merchant?.city ?? "",
    address: merchant?.address ?? "",
    picName: merchant?.picName ?? "",
    picPhone: merchant?.picPhone ?? "",
    picEmail: merchant?.picEmail ?? "",
  };
}

function MerchantDialog({
  mode,
  merchant,
  generatedMid,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  merchant?: Merchant;
  generatedMid: string;
  open: boolean;
  onClose: () => void;
  onSave: (merchant: Merchant) => void;
}) {
  const form = useForm({
    defaultValues: getMerchantFormValues(merchant, generatedMid),
    onSubmit: ({ value }) => {
      onSave({
        id: merchant?.id ?? "",
        mid: value.mid,
        name: value.name.trim(),
        brandName: value.brandName.trim(),
        segment: value.segment,
        status: value.status,
        servicePointId: value.servicePointId,
        region: value.region.trim(),
        city: value.city.trim(),
        address: value.address.trim(),
        picName: value.picName.trim(),
        picPhone: value.picPhone.trim(),
        picEmail: value.picEmail.trim(),
        activeTerminalCount: merchant?.activeTerminalCount ?? 0,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-h-[min(48rem,calc(100vh-2rem))] max-w-4xl">
        <form
          className="flex max-h-[inherit] flex-col overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Merchant Outlet
            </p>
            <DialogTitle>
              {mode === "create" ? "Add Merchant" : "Update Merchant"}
            </DialogTitle>
            <DialogDescription>
              Manage outlet identity, branch grouping, service coverage, and
              merchant contact ownership.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 overflow-y-auto p-5">
            <FormSection title="Identity" icon={LuStore}>
              <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    MID
                  </span>
                  <form.Field name="mid">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        readOnly
                        className="bg-white font-bold text-accent"
                        data-testid="merchant-mid-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Outlet name
                  </span>
                  <form.Field name="name">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Indomaret Cikini 04"
                        data-testid="merchant-name-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2 sm:col-span-1">
                  <span className="text-xs font-semibold text-foreground/65">
                    Brand / parent merchant
                  </span>
                  <form.Field name="brandName">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Indomaret"
                        data-testid="merchant-brand-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Segment
                  </span>
                  <form.Field name="segment">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value as MerchantSegment)
                        }
                        data-testid="merchant-segment-select"
                      >
                        {merchantSegments.map((segment) => (
                          <option key={segment} value={segment}>
                            {segment}
                          </option>
                        ))}
                      </Select>
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Status
                  </span>
                  <form.Field name="status">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value as MerchantStatus)
                        }
                        data-testid="merchant-status-select"
                      >
                        {merchantStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>

            <FormSection title="Coverage" icon={LuMapPin}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Service point
                  </span>
                  <form.Field name="servicePointId">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onChange={(event) => {
                          const servicePoint = SERVICE_POINTS.find(
                            (item) => item.id === event.target.value,
                          );

                          field.handleChange(event.target.value);
                          if (servicePoint) {
                            form.setFieldValue("region", servicePoint.region);
                            form.setFieldValue("city", servicePoint.city);
                          }
                        }}
                        data-testid="merchant-service-point-select"
                      >
                        {SERVICE_POINTS.map((servicePoint) => (
                          <option key={servicePoint.id} value={servicePoint.id}>
                            {servicePoint.code} - {servicePoint.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Region
                  </span>
                  <form.Field name="region">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Jabodetabek North"
                        data-testid="merchant-region-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>

            <FormSection title="Location" icon={LuBuilding2}>
              <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    City
                  </span>
                  <form.Field name="city">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Jakarta"
                        data-testid="merchant-city-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Address
                  </span>
                  <form.Field name="address">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Street address"
                        data-testid="merchant-address-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>

            <FormSection title="PIC Contact" icon={LuUserRound}>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    PIC name
                  </span>
                  <form.Field name="picName">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Contact name"
                        data-testid="merchant-pic-name-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    PIC phone
                  </span>
                  <form.Field name="picPhone">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="+62 ..."
                        data-testid="merchant-pic-phone-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    PIC email
                  </span>
                  <form.Field name="picEmail">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="name@merchant.co.id"
                        type="email"
                        data-testid="merchant-pic-email-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.values}>
              {(values) => (
                <Button
                  type="submit"
                  disabled={
                    !values.name.trim() ||
                    !values.brandName.trim() ||
                    !values.segment ||
                    !values.status ||
                    !values.servicePointId ||
                    !values.city.trim() ||
                    !values.address.trim() ||
                    !values.picName.trim() ||
                    !values.picPhone.trim()
                  }
                  data-testid="save-merchant-button"
                >
                  {mode === "create" ? "Add Merchant" : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MerchantDirectory() {
  const [merchants, setMerchants] = useState<Merchant[]>(MERCHANTS);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
    null,
  );

  const servicePointById = useMemo(() => getServicePointMap(SERVICE_POINTS), []);
  const generatedMid = useMemo(() => getNextMerchantMid(merchants), [merchants]);
  const tableData = useMemo<MerchantRow[]>(
    () =>
      merchants.map((merchant) => {
        const servicePoint = servicePointById[merchant.servicePointId];

        return {
          ...merchant,
          servicePointCode: servicePoint?.code ?? "Unassigned",
          servicePointName: servicePoint?.name ?? "Unassigned service point",
          activeTerminals: getActiveTerminalCount(merchant.id),
        };
      }),
    [merchants, servicePointById],
  );

  const columns = useMemo<ColumnDef<MerchantRow>[]>(
    () => [
      {
        id: "merchant",
        accessorFn: (row) => `${row.mid} ${row.name}`,
        header: "Merchant / Outlet",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.name}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-accent">
              {row.original.mid}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "brandName",
        id: "brandName",
        header: "Brand",
        size: 180,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        size: 140,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "segment",
        id: "segment",
        header: "Segment",
        size: 140,
      },
      {
        id: "servicePoint",
        accessorFn: (row) => `${row.servicePointCode} ${row.servicePointName}`,
        header: "Service Point",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.servicePointName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.servicePointCode}
            </p>
          </div>
        ),
      },
      {
        id: "location",
        accessorFn: (row) => `${row.region} ${row.city} ${row.address}`,
        header: "Region / City",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.region}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.city} - {row.original.address}
            </p>
          </div>
        ),
      },
      {
        id: "pic",
        accessorFn: (row) =>
          `${row.picName} ${row.picPhone} ${row.picEmail}`,
        header: "PIC Contact",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.picName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.picPhone}
              {row.original.picEmail ? ` - ${row.original.picEmail}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "activeTerminals",
        id: "activeTerminals",
        header: "Active Terminals",
        size: 160,
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        size: 140,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedMerchant(row.original)}
            size="sm"
            aria-label={`Update ${row.original.name}`}
            data-testid={`update-merchant-${row.original.id}`}
          >
            <LuPencil className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Update
          </Button>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnPinning,
      globalFilter,
      pagination,
    },
    onColumnPinningChange: setColumnPinning,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const paginationItems = useMemo(
    () => getPaginationItems(pageCount, currentPage),
    [currentPage, pageCount],
  );
  const activeOutlets = merchants.filter(
    (merchant) => merchant.status === "Active",
  ).length;
  const activeTerminals = tableData.reduce(
    (total, merchant) => total + merchant.activeTerminals,
    0,
  );
  const servicePointsCovered = new Set(
    merchants.map((merchant) => merchant.servicePointId),
  ).size;

  const createMerchant = (merchant: Merchant) => {
    const id = getMerchantId(
      merchant.mid,
      merchant.name,
      new Set(merchants.map((item) => item.id)),
    );

    setMerchants((current) => [...current, { ...merchant, id }]);
    setCreateOpen(false);
  };

  const updateMerchant = (merchant: Merchant) => {
    if (!selectedMerchant) return;

    setMerchants((current) =>
      current.map((item) =>
        item.id === selectedMerchant.id
          ? {
              ...item,
              ...merchant,
              id: selectedMerchant.id,
              mid: selectedMerchant.mid,
              activeTerminalCount: item.activeTerminalCount,
            }
          : item,
      ),
    );
    setSelectedMerchant(null);
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="merchant-directory-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Merchants
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Merchant Directory
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Manage merchant outlets, branch grouping, service point coverage,
            and operational PIC ownership from one workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="Outlets" value={merchants.length} icon={LuStore} />
          <MetricTile
            label="Active"
            value={activeOutlets}
            icon={LuBadgeCheck}
            tone="good"
          />
          <MetricTile
            label="Terminals"
            value={activeTerminals}
            icon={LuCreditCard}
            tone={activeTerminals ? "good" : "warning"}
          />
          <MetricTile
            label="Service Points"
            value={servicePointsCovered}
            icon={LuMapPin}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuCircleDot className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Merchant List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search merchants</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search MID, merchant, brand, city..."
                className="pl-9"
                data-testid="merchant-search-input"
              />
            </label>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="create-merchant-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              Add Merchant
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table style={{ minWidth: table.getTotalSize() }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-background">
                  {headerGroup.headers.map((header) => {
                    const pinnedStyles = getPinnedColumnStyles(header.column);

                    return (
                      <TableHead
                        key={header.id}
                        style={{ ...pinnedStyles, background: "#F6F7F9" }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={getPinnedColumnStyles(cell.column)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-foreground/60"
                  >
                    No merchants match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/60">
            Page{" "}
            <span className="font-semibold text-foreground">
              {pageCount ? currentPage : 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {pageCount || 0}
            </span>
          </p>

          <div className="flex max-w-full items-center gap-2 overflow-x-auto">
            <IconPageButton
              label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              <LuChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <IconPageButton
              label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <LuChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
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
                    onClick={() => table.setPageIndex(item - 1)}
                    variant={item === currentPage ? "default" : "outline"}
                    size="icon"
                    className="min-w-9 px-3"
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <IconPageButton
              label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <LuChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <IconPageButton
              label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(pageCount - 1)}
            >
              <LuChevronsRight className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
          </div>
        </div>
      </section>

      {createOpen ? (
        <MerchantDialog
          mode="create"
          generatedMid={generatedMid}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createMerchant}
        />
      ) : null}

      {selectedMerchant ? (
        <MerchantDialog
          key={selectedMerchant.id}
          mode="update"
          merchant={selectedMerchant}
          generatedMid={selectedMerchant.mid}
          open={Boolean(selectedMerchant)}
          onClose={() => setSelectedMerchant(null)}
          onSave={updateMerchant}
        />
      ) : null}
    </div>
  );
}
