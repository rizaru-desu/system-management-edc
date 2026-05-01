import { useMemo, useState } from "react";
import {
  LuBarcode,
  LuBoxes,
  LuClipboardList,
  LuEye,
  LuFileCheck2,
  LuPackageCheck,
  LuSearch,
  LuShieldAlert,
  LuTruck,
  LuWarehouse,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
import { DELIVERY_ORDERS, PRODUCTS, WAREHOUSES } from "~/data/mockData";

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  DeliveryOrder,
  DeliveryOrderStatus,
  Product,
  Warehouse,
} from "~/data/mockData";

type StatusFilter = DeliveryOrderStatus | "All";
type DeliveryOrderRow = DeliveryOrder & {
  warehouseCode: string;
  warehouseName: string;
};

const statusFilters: StatusFilter[] = [
  "All",
  "Requested",
  "Reserved",
  "Picked / Packed",
  "In Delivery",
  "Delivered",
  "Installed / Assigned",
  "Exception",
  "Cancelled",
];

export function meta() {
  return [
    { title: "Delivery / Outbound | EDC.OS" },
    {
      name: "description",
      content:
        "Outbound delivery workspace for asset reservation, pick-pack, dispatch, handover, and install proof.",
    },
  ];
}

function mapById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function StatusBadge({ status }: { status: DeliveryOrderStatus }) {
  const variantMap: Record<
    DeliveryOrderStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    Requested: "secondary",
    Reserved: "default",
    "Picked / Packed": "default",
    "In Delivery": "outline",
    Delivered: "outline",
    "Installed / Assigned": "success",
    Exception: "destructive",
    Cancelled: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-28 justify-center">
      {status}
    </Badge>
  );
}

function ProofBadge({ status }: { status: DeliveryOrder["proofStatus"] }) {
  const variantMap: Record<
    DeliveryOrder["proofStatus"],
    "success" | "warning" | "destructive" | "secondary"
  > = {
    Pending: "secondary",
    Partial: "warning",
    Complete: "success",
    Issue: "destructive",
  };

  return <Badge variant={variantMap[status]}>Proof {status}</Badge>;
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
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
          <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function DetailPanel({
  order,
  productsById,
}: {
  order: DeliveryOrderRow;
  productsById: Record<string, Product>;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="rounded-xl border border-border bg-white">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
            <LuTruck className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Delivery Detail
            </h2>
            <p className="text-xs text-foreground/60">
              Reservation, dispatch, handover, and proof tracking
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Order" value={order.orderNumber} />
          <DetailField label="Request Type" value={order.requestType} />
          <DetailField label="Destination" value={order.destinationName} />
          <DetailField label="Source Warehouse" value={order.warehouseName} />
          <DetailField label="Assigned Team" value={order.assignedTeam} />
          <DetailField label="Target" value={order.targetAt} />
        </div>

        <div className="border-t border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Delivery Lines
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-background">
                  <TableHead>Product</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Serials / Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line) => {
                  const product = productsById[line.productId];

                  return (
                    <TableRow key={`${order.id}-${line.productId}`}>
                      <TableCell>
                        <p className="font-semibold text-foreground">
                          {product?.sku ?? line.productId}
                        </p>
                        <p className="mt-1 text-xs text-foreground/55">
                          {product?.name ?? "Unknown product"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{line.trackingType}</Badge>
                      </TableCell>
                      <TableCell>{line.requestedQty}</TableCell>
                      <TableCell>{line.allocatedQty}</TableCell>
                      <TableCell>{line.deliveredQty}</TableCell>
                      <TableCell className="max-w-72 text-xs text-foreground/60">
                        {line.serialNumbers?.join(", ") ?? "Quantity allocation"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <section className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={order.status} />
            <ProofBadge status={order.proofStatus} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <p className="flex items-center justify-between gap-3">
              <span className="text-foreground/55">Requested</span>
              <span className="font-semibold text-foreground">
                {order.requestedQty}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-foreground/55">Allocated</span>
              <span className="font-semibold text-foreground">
                {order.allocatedQty}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-foreground/55">Delivered</span>
              <span className="font-semibold text-foreground">
                {order.deliveredQty}
              </span>
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2">
            <LuClipboardList className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-semibold text-foreground">Timeline</h2>
          </div>
          <div className="mt-4 space-y-4">
            {order.timeline.map((event, index) => (
              <div key={`${event.label}-${index}`} className="flex gap-3">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{event.label}</p>
                  <p className="mt-1 text-xs text-foreground/55">
                    {event.timestamp ?? event.status}
                  </p>
                  {event.owner ? (
                    <p className="mt-1 text-xs font-medium text-foreground/65">
                      {event.owner}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2">
            <LuFileCheck2 className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-semibold text-foreground">Documents</h2>
          </div>
          <div className="mt-4 space-y-3">
            {order.documents.map((document) => (
              <div
                key={`${document.type}-${document.ref}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {document.type}
                  </p>
                  <p className="truncate text-xs text-foreground/55">
                    {document.ref}
                  </p>
                </div>
                <Badge
                  variant={
                    document.status === "Pending" ? "warning" : "success"
                  }
                >
                  {document.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

export default function OutboundDeliveries() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedOrderId, setSelectedOrderId] = useState(DELIVERY_ORDERS[0]?.id);
  const productsById = useMemo(() => mapById<Product>(PRODUCTS), []);
  const warehousesById = useMemo(() => mapById<Warehouse>(WAREHOUSES), []);
  const orders = useMemo<DeliveryOrderRow[]>(
    () =>
      DELIVERY_ORDERS.map((order) => {
        const warehouse = warehousesById[order.sourceWarehouseId];

        return {
          ...order,
          warehouseCode: warehouse?.code ?? "Unassigned",
          warehouseName: warehouse?.name ?? "Unassigned warehouse",
        };
      }),
    [warehousesById],
  );
  const filteredOrders = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;
      const matchesSearch =
        !search ||
        [
          order.orderNumber,
          order.requestType,
          order.requester,
          order.destinationName,
          order.assignedTeam,
          order.warehouseCode,
          order.warehouseName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [globalFilter, orders, statusFilter]);
  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ??
    filteredOrders[0];
  const openOrders = orders.filter(
    (order) => !["Installed / Assigned", "Cancelled"].includes(order.status),
  ).length;
  const outboundUnits = orders.reduce(
    (total, order) => total + order.requestedQty,
    0,
  );
  const inDeliveryUnits = orders
    .filter((order) => order.status === "In Delivery")
    .reduce((total, order) => total + order.allocatedQty, 0);
  const proofIssues = orders.filter(
    (order) => order.proofStatus === "Pending" || order.proofStatus === "Issue",
  ).length;

  return (
    <div
      className="animate-fade-up space-y-6"
      data-testid="outbound-deliveries-page"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Delivery / Outbound
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Track request, reservation, pick-pack, dispatch, handover, and
            install proof without mixing outbound flow into inbound receiving.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile
            label="Open"
            value={openOrders}
            icon={LuTruck}
            tone={openOrders ? "warning" : "good"}
          />
          <MetricTile label="Requested" value={outboundUnits} icon={LuBoxes} />
          <MetricTile
            label="In Delivery"
            value={inDeliveryUnits}
            icon={LuBarcode}
          />
          <MetricTile
            label="Proof Pending"
            value={proofIssues}
            icon={LuShieldAlert}
            tone={proofIssues ? "danger" : "good"}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuPackageCheck className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Delivery Queue
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredOrders.length} matching orders
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search delivery orders</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search DO, destination, team..."
                className="pl-9"
                data-testid="outbound-search-input"
              />
            </label>
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="sm:w-52"
              data-testid="outbound-status-filter"
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All status" : status}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table style={{ minWidth: 1040 }}>
            <TableHeader>
              <TableRow className="hover:bg-background">
                <TableHead>Delivery Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={
                      order.id === selectedOrder?.id ? "bg-muted/30" : undefined
                    }
                  >
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {order.requestType} - {order.requester}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {order.destinationName}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {order.destinationType}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {order.warehouseCode}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {order.assignedTeam}
                      </p>
                    </TableCell>
                    <TableCell>
                      {order.allocatedQty}/{order.requestedQty}
                    </TableCell>
                    <TableCell>
                      <ProofBadge status={order.proofStatus} />
                    </TableCell>
                    <TableCell>{order.targetAt}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => setSelectedOrderId(order.id)}
                        size="sm"
                        variant={
                          order.id === selectedOrder?.id ? "default" : "outline"
                        }
                        data-testid={`view-outbound-${order.id}`}
                      >
                        <LuEye className="h-3.5 w-3.5" strokeWidth={1.75} />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-foreground/60"
                  >
                    No delivery orders match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {selectedOrder ? (
        <DetailPanel order={selectedOrder} productsById={productsById} />
      ) : null}
    </div>
  );
}
