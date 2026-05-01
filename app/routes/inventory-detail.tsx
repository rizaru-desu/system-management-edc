import { Link, useParams } from "react-router";
import {
  LuArrowLeft,
  LuBarcode,
  LuBox,
  LuCalendar,
  LuClipboardList,
  LuHistory,
  LuPackage,
  LuTruck,
  LuWarehouse,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DELIVERY_ORDERS, INVENTORY_ITEMS, INBOUND_SHIPMENTS, PRODUCTS, WAREHOUSES } from "~/data/mockData";

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  InboundShipment,
  InventoryCondition,
  InventoryItemStatus,
  Product,
  Warehouse,
  DeliveryOrder,
} from "~/data/mockData";

export function meta() {
  return [
    { title: "Asset Detail | EDC.OS" },
    {
      name: "description",
      content: "Asset lifecycle, traceability, and linked document workspace.",
    },
  ];
}

function mapById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function StatusBadge({ status }: { status: InventoryItemStatus }) {
  const variantMap: Record<
    InventoryItemStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    "Available / Stock Titipan": "success",
    Reserved: "default",
    "Picked / Packed": "default",
    "In Delivery": "default",
    Installed: "outline",
    Returned: "secondary",
    Quarantine: "destructive",
    Discrepancy: "warning",
    "In Repair": "warning",
    Retired: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function ConditionBadge({ condition }: { condition: InventoryCondition }) {
  const variantMap: Record<
    InventoryCondition,
    "success" | "warning" | "destructive" | "secondary"
  > = {
    New: "success",
    Good: "success",
    "Needs QC": "warning",
    Damaged: "destructive",
  };

  return <Badge variant={variantMap[condition]}>{condition}</Badge>;
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
        <p className={`mt-1 truncate text-xl font-bold ${toneClass}`}>{value}</p>
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

export default function InventoryDetail() {
  const params = useParams();
  const serialNumber = params.serialNumber
    ? decodeURIComponent(params.serialNumber)
    : undefined;
  const productById = mapById<Product>(PRODUCTS);
  const warehouseById = mapById<Warehouse>(WAREHOUSES);
  const inboundById = mapById<InboundShipment>(INBOUND_SHIPMENTS);
  const deliveryById = mapById<DeliveryOrder>(DELIVERY_ORDERS);
  const item =
    INVENTORY_ITEMS.find((entry) => entry.serialNumber === serialNumber) ??
    INVENTORY_ITEMS[0];
  const product = productById[item.productId];
  const warehouse = warehouseById[item.warehouseId];
  const inboundShipment = item.inboundShipmentId
    ? inboundById[item.inboundShipmentId]
    : undefined;
  const relatedDeliveries = DELIVERY_ORDERS.filter((order) =>
    order.lines.some((line) =>
      line.serialNumbers?.includes(item.serialNumber) ||
      (line.productId === item.productId && product?.trackingType === "Quantity"),
    ),
  );
  const latestDelivery = relatedDeliveries[0]
    ? deliveryById[relatedDeliveries[0].id]
    : undefined;

  return (
    <div
      className="animate-fade-up space-y-6"
      data-testid="inventory-detail-page"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            to="/app/inventory/list"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "mb-3 -ml-3",
            })}
          >
            <LuArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Asset Registry
          </Link>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {item.serialNumber}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Lifecycle traceability for asset profile, current location,
            inbound/outbound source, linked documents, and movement history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={item.status} />
          <ConditionBadge condition={item.condition} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          label="Product"
          value={product?.sku ?? "Unknown"}
          icon={LuPackage}
        />
        <MetricTile
          label="Warehouse"
          value={warehouse?.code ?? "Unassigned"}
          icon={LuWarehouse}
        />
        <MetricTile
          label="Tracking"
          value={product?.trackingType ?? "Serialized"}
          icon={LuBox}
        />
        <MetricTile
          label="Quantity"
          value={item.stockQuantity ?? 1}
          icon={LuCalendar}
          tone={item.condition === "Damaged" ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl border border-border bg-white">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuBarcode className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Asset Profile
              </h2>
              <p className="text-xs text-foreground/60">
                Product, ownership, location, and lifecycle information
              </p>
            </div>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <DetailField label="Serial Number" value={item.serialNumber} />
            <DetailField
              label="Product"
              value={
                <Link
                  to={`/app/products/detail/${product?.id ?? ""}`}
                  className="text-accent hover:underline"
                >
                  {product?.name ?? "Unknown product"}
                </Link>
              }
            />
            <DetailField label="SKU" value={product?.sku ?? "Unknown"} />
            <DetailField label="Category" value={product?.category ?? "Unknown"} />
            <DetailField
              label="Tracking Type"
              value={product?.trackingType ?? "Serialized"}
            />
            <DetailField label="Current Quantity" value={item.stockQuantity ?? 1} />
            <DetailField label="Owner Client" value={item.ownerClient} />
            <DetailField label="Firmware" value={item.firmwareVersion ?? "N/A"} />
            <DetailField
              label="Warehouse"
              value={`${warehouse?.code ?? "Unassigned"} - ${
                warehouse?.name ?? "Unassigned warehouse"
              }`}
            />
            <DetailField label="Bin Location" value={item.binLocation} />
            <DetailField label="Received At" value={item.receivedAt} />
            <DetailField label="Last Movement" value={item.lastMovementAt} />
            <DetailField
              label="Inbound Source"
              value={
                inboundShipment ? (
                  <Link
                    to="/app/inventory/inbound"
                    className="text-accent hover:underline"
                  >
                    {inboundShipment.asnNumber}
                  </Link>
                ) : (
                  "Manual stock record"
                )
              }
            />
            <DetailField
              label="Outbound Source"
              value={
                latestDelivery ? (
                  <Link
                    to="/app/inventory/outbound"
                    className="text-accent hover:underline"
                  >
                    {latestDelivery.orderNumber}
                  </Link>
                ) : (
                  "No linked delivery"
                )
              }
            />
            <DetailField label="Warranty Until" value={item.warrantyUntil ?? "N/A"} />
          </div>
          <div className="border-t border-border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
              Notes
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/65">
              {item.notes}
            </p>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-white">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
                <LuHistory className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Movement History
                </h2>
                <p className="text-xs text-foreground/60">
                  Latest trace events
                </p>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {item.movementHistory.map((event, index) => (
                <div key={`${event.label}-${index}`} className="flex gap-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-accent">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{event.label}</p>
                    <p className="mt-1 text-xs leading-5 text-foreground/55">
                  {event.timestamp} - {event.location}
                </p>
                <p className="mt-1 text-xs font-medium text-foreground/65">
                  {event.owner}
                </p>
                {event.sourceDocument ? (
                  <p className="mt-1 text-xs text-accent">{event.sourceDocument}</p>
                ) : null}
                {event.note ? (
                  <p className="mt-1 text-xs leading-5 text-foreground/55">
                    {event.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <LuClipboardList className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-semibold text-foreground">Trace Summary</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Condition risk</span>
                <span className="font-semibold text-foreground">
                  {item.condition === "Damaged" || item.condition === "Needs QC"
                    ? "Review required"
                    : "Clear"}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Stock status</span>
                <span className="font-semibold text-foreground">{item.status}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Outbound status</span>
                <span className="font-semibold text-foreground">
                  {latestDelivery?.status ?? "Not allocated"}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Source document</span>
                <span className="font-semibold text-foreground">
                  {latestDelivery?.documents[0]?.ref ??
                    inboundShipment?.grnNumber ??
                    inboundShipment?.asnNumber ??
                    "N/A"}
                </span>
              </p>
            </div>
          </section>
          <section className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <LuTruck className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-semibold text-foreground">Linked Documents</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ...(inboundShipment?.documents ?? []),
                ...(latestDelivery?.documents ?? []),
              ].map((document) => (
                <p
                  key={`${document.type}-${document.ref}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-foreground/55">{document.type}</span>
                  <span className="truncate font-semibold text-foreground">
                    {document.ref}
                  </span>
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
