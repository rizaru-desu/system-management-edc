import { Link } from "react-router";
import { LuArchive, LuClock, LuFileSearch, LuPackageX } from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { INVENTORY_ITEMS, PRODUCTS } from "~/data/mockData";

export function meta() {
  return [
    { title: "Asset Archive | EDC.OS" },
    {
      name: "description",
      content: "Archived, retired, returned, and replacement asset records.",
    },
  ];
}

function getProduct(productId: string) {
  return PRODUCTS.find((product) => product.id === productId);
}

export default function AssetArchive() {
  const archivedItems = INVENTORY_ITEMS.filter((item) =>
    ["Retired", "Returned", "In Repair"].includes(item.status),
  );

  return (
    <div className="animate-fade-up space-y-6" data-testid="asset-archive-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Asset Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Asset Archive
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Review retired, returned, repair, replacement, and disposal-ready
            asset records without mixing them into active delivery queues.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 md:min-w-[32rem]">
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
              <LuArchive className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
              Archive
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {archivedItems.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
              <LuPackageX className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
              Retired
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {archivedItems.filter((item) => item.status === "Retired").length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
              <LuClock className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
              Review
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {archivedItems.filter((item) => item.status === "In Repair").length}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
            <LuFileSearch className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Archive Records
            </h2>
            <p className="text-xs text-foreground/60">
              Returned, repair, and retired assets
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table style={{ minWidth: 900 }}>
            <TableHeader>
              <TableRow className="hover:bg-background">
                <TableHead>Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Last Movement</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedItems.map((item) => {
                const product = getProduct(item.productId);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {item.serialNumber}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {product?.sku ?? item.productId}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.condition === "Damaged" ? "destructive" : "warning"
                        }
                      >
                        {item.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.ownerClient}</TableCell>
                    <TableCell>{item.binLocation}</TableCell>
                    <TableCell>{item.lastMovementAt}</TableCell>
                    <TableCell>
                      <Link
                        to={`/app/inventory/detail/${encodeURIComponent(
                          item.serialNumber,
                        )}`}
                        className="text-sm font-semibold text-accent hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
