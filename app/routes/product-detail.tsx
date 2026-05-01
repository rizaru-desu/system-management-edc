import { Link, useParams } from "react-router";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuBox,
  LuClipboardList,
  LuPackage,
  LuPackageCheck,
  LuShieldAlert,
  LuTags,
  LuWarehouse,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { INVENTORY_ITEMS, PRODUCTS, WAREHOUSES } from "~/data/mockData";

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  InventoryItem,
  ProductCategory,
  ProductStatus,
  Warehouse,
} from "~/data/mockData";

export function meta() {
  return [
    { title: "Product Detail | EDC.OS" },
    {
      name: "description",
      content: "Product master detail and inventory summary workspace.",
    },
  ];
}

function mapById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variantMap: Record<
    ProductStatus,
    "success" | "warning" | "secondary"
  > = {
    Active: "success",
    "Phasing Out": "warning",
    Inactive: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: ProductCategory }) {
  const variantMap: Record<ProductCategory, "default" | "outline" | "secondary"> = {
    Terminal: "default",
    Peripheral: "outline",
    "Spare Part": "secondary",
  };

  return <Badge variant={variantMap[category]}>{category}</Badge>;
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
        <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
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

function getWarehouseSummary(items: InventoryItem[]) {
  const warehouseById = mapById<Warehouse>(WAREHOUSES);
  const summaries = new Map<
    string,
    { warehouse: Warehouse | undefined; total: number; available: number; exception: number }
  >();

  items.forEach((item) => {
    const current =
      summaries.get(item.warehouseId) ??
      {
        warehouse: warehouseById[item.warehouseId],
        total: 0,
        available: 0,
        exception: 0,
      };

    current.total += 1;
    if (item.status === "Available / Stock Titipan") current.available += 1;
    if (item.status === "Discrepancy" || item.status === "Quarantine") {
      current.exception += 1;
    }
    summaries.set(item.warehouseId, current);
  });

  return Array.from(summaries.values());
}

export default function ProductDetail() {
  const params = useParams();
  const product =
    PRODUCTS.find((entry) => entry.id === params.productId) ?? PRODUCTS[0];
  const stockItems = INVENTORY_ITEMS.filter(
    (item) => item.productId === product.id,
  );
  const warehouseById = mapById<Warehouse>(WAREHOUSES);
  const availableStock = stockItems.filter(
    (item) => item.status === "Available / Stock Titipan",
  ).length;
  const installedStock = stockItems.filter(
    (item) => item.status === "Installed",
  ).length;
  const exceptionStock = stockItems.filter(
    (item) => item.status === "Discrepancy" || item.status === "Quarantine",
  ).length;
  const warehouseSummary = getWarehouseSummary(stockItems);

  return (
    <div className="animate-fade-up space-y-6" data-testid="product-detail-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            to="/app/products/list"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "mb-3 -ml-3",
            })}
          >
            <LuArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Product List
          </Link>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Product Detail
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Product master profile with stock summary, compatible accessories,
            and linked serial-number inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProductStatusBadge status={product.status} />
          <CategoryBadge category={product.category} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Total SN" value={stockItems.length} icon={LuPackage} />
        <MetricTile
          label="Available"
          value={availableStock}
          icon={LuPackageCheck}
          tone="good"
        />
        <MetricTile label="Installed" value={installedStock} icon={LuWarehouse} />
        <MetricTile
          label="Exceptions"
          value={exceptionStock}
          icon={LuShieldAlert}
          tone={exceptionStock ? "danger" : "good"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl border border-border bg-white">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuTags className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Product Profile
              </h2>
              <p className="text-xs text-foreground/60">
                Master data and policy fields
              </p>
            </div>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <DetailField label="SKU" value={product.sku} />
            <DetailField label="Brand" value={product.brand} />
            <DetailField label="Model" value={product.model} />
            <DetailField label="Unit" value={product.unit} />
            <DetailField
              label="Warranty"
              value={`${product.warrantyMonths} months`}
            />
            <DetailField label="Minimum Stock" value={product.minStock} />
          </div>
          <div className="border-t border-border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
              Description
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/65">
              {product.description}
            </p>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <LuBadgeCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-semibold text-foreground">Accessories</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.compatibleAccessories.map((accessory) => (
                <Badge key={accessory} variant="outline">
                  {accessory}
                </Badge>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <LuClipboardList className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-semibold text-foreground">Planning Signal</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Available vs min</span>
                <span
                  className={`font-semibold ${
                    availableStock < product.minStock
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {availableStock}/{product.minStock}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Lifecycle</span>
                <span className="font-semibold text-foreground">
                  {product.status}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-foreground/55">Exception stock</span>
                <span className="font-semibold text-foreground">
                  {exceptionStock}
                </span>
              </p>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
            <LuWarehouse className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Warehouse Stock
            </h2>
            <p className="text-xs text-foreground/60">
              SN count by warehouse for this product
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-background">
                <TableHead>Warehouse</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Exception</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouseSummary.length ? (
                warehouseSummary.map((summary) => (
                  <TableRow key={summary.warehouse?.id ?? "unassigned"}>
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {summary.warehouse?.name ?? "Unassigned warehouse"}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {summary.warehouse?.code ?? "Unassigned"}
                      </p>
                    </TableCell>
                    <TableCell>{summary.total}</TableCell>
                    <TableCell>{summary.available}</TableCell>
                    <TableCell>
                      <span
                        className={
                          summary.exception
                            ? "font-semibold text-rose-700"
                            : "text-foreground/55"
                        }
                      >
                        {summary.exception}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-foreground/60"
                  >
                    No serial-number stock has been recorded for this product.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
            <LuBox className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Linked Inventory
            </h2>
            <p className="text-xs text-foreground/60">
              Serial numbers using this product master
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-background">
                <TableHead>Serial Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.length ? (
                stockItems.map((item) => {
                  const warehouse = warehouseById[item.warehouseId];

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-semibold text-foreground">
                          {item.serialNumber}
                        </p>
                        <p className="mt-1 text-xs text-foreground/55">
                          {item.condition}
                        </p>
                      </TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>
                        {warehouse?.code ?? "Unassigned"} - {item.binLocation}
                      </TableCell>
                      <TableCell>{item.ownerClient}</TableCell>
                      <TableCell>
                        <Link
                          to={`/app/inventory/detail/${encodeURIComponent(
                            item.serialNumber,
                          )}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          View SN
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-foreground/60"
                  >
                    No linked inventory records.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
