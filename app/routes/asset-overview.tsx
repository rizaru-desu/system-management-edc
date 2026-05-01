import {
  LuArrowRight,
  LuBoxes,
  LuPackageCheck,
  LuShieldAlert,
  LuTruck,
  LuWarehouse,
} from "react-icons/lu";
import { Link } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  DELIVERY_ORDERS,
  INBOUND_SHIPMENTS,
  INVENTORY_ITEMS,
  PRODUCTS,
  WAREHOUSES,
} from "~/data/mockData";

import type { IconType } from "react-icons";
import type { InventoryItemStatus, Product } from "~/data/mockData";

export function meta() {
  return [
    { title: "Asset Overview | EDC.OS" },
    {
      name: "description",
      content: "Asset Management overview for inventory, inbound, outbound, and exceptions.",
    },
  ];
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

function getProductStock(product: Product) {
  return INVENTORY_ITEMS.filter((item) => item.productId === product.id).reduce(
    (total, item) =>
      item.status === "Available / Stock Titipan"
        ? total + (item.stockQuantity ?? 1)
        : total,
    0,
  );
}

export default function AssetOverview() {
  const statusCounts = INVENTORY_ITEMS.reduce(
    (counts, item) => ({
      ...counts,
      [item.status]: (counts[item.status] ?? 0) + (item.stockQuantity ?? 1),
    }),
    {} as Partial<Record<InventoryItemStatus, number>>,
  );
  const openInbound = INBOUND_SHIPMENTS.filter(
    (shipment) => shipment.status !== "Completed",
  ).length;
  const openOutbound = DELIVERY_ORDERS.filter(
    (order) =>
      !["Installed / Assigned", "Cancelled"].includes(order.status),
  ).length;
  const exceptionAssets =
    (statusCounts.Discrepancy ?? 0) + (statusCounts.Quarantine ?? 0);
  const lowStockProducts = PRODUCTS.filter(
    (product) => getProductStock(product) < product.minStock,
  );
  const warehouseCapacity = WAREHOUSES.reduce(
    (total, warehouse) => total + warehouse.capacityUsed,
    0,
  );

  return (
    <div className="animate-fade-up space-y-6" data-testid="asset-overview-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Asset Overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            One control view for asset availability, inbound receiving,
            delivery, service stock, and lifecycle exceptions.
          </p>
        </div>
        <Link
          to="/app/inventory/outbound"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
        >
          Delivery Queue
          <LuArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricTile
          label="Asset Records"
          value={INVENTORY_ITEMS.length}
          icon={LuBoxes}
        />
        <MetricTile
          label="Available"
          value={statusCounts["Available / Stock Titipan"] ?? 0}
          icon={LuPackageCheck}
          tone="good"
        />
        <MetricTile
          label="Open Inbound"
          value={openInbound}
          icon={LuWarehouse}
          tone={openInbound ? "warning" : "good"}
        />
        <MetricTile
          label="Open Outbound"
          value={openOutbound}
          icon={LuTruck}
          tone={openOutbound ? "warning" : "good"}
        />
        <MetricTile
          label="Exceptions"
          value={exceptionAssets}
          icon={LuShieldAlert}
          tone={exceptionAssets ? "danger" : "good"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-xl border border-border bg-white">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-semibold text-foreground">
              Lifecycle Pulse
            </h2>
            <p className="text-xs text-foreground/60">
              Current stock by asset lifecycle status
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              "Available / Stock Titipan",
              "Reserved",
              "Picked / Packed",
              "In Delivery",
              "Installed",
              "Returned",
              "In Repair",
              "Quarantine",
              "Retired",
            ].map((status) => (
              <div key={status} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-foreground/60">
                  {status}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {statusCounts[status as InventoryItemStatus] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-4">
            <h2 className="font-semibold text-foreground">Low Stock Watch</h2>
            <div className="mt-4 space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {product.sku}
                    </p>
                    <p className="text-xs text-foreground/55">
                      Available {getProductStock(product)} / Min {product.minStock}
                    </p>
                  </div>
                  <Badge variant="warning">{product.trackingType}</Badge>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-white p-4">
            <h2 className="font-semibold text-foreground">Warehouse Load</h2>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {warehouseCapacity.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              Units currently occupying warehouse capacity.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
