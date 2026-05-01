import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/login.tsx", { id: "index" }),
  route("login", "routes/login.tsx", { id: "login" }),
  route("app", "routes/app.tsx", { id: "app-layout" }, [
    index("routes/dashboard.tsx", { id: "app-index" }),
    route("dashboard", "routes/dashboard.tsx", { id: "dashboard" }),
    route("field/technicians", "routes/technicians.tsx", {
      id: "technician-directory",
    }),
    route("field/clusters", "routes/clusters.tsx", {
      id: "work-clusters",
    }),
    route("merchants/directory", "routes/merchants.tsx", {
      id: "merchant-directory",
    }),
    route("terminals/registry", "routes/terminal-registry.tsx", {
      id: "terminal-registry",
    }),
    route("contracts/accounts", "routes/accounts.tsx", {
      id: "accounts",
    }),
    route("contracts/projects", "routes/projects.tsx", {
      id: "projects",
    }),
    route("contracts/lines", "routes/contract-lines.tsx", {
      id: "contract-lines",
    }),
    route("inventory/stock", "routes/warehouses.tsx", {
      id: "warehouse-stock",
    }),
    route("inventory/overview", "routes/asset-overview.tsx", {
      id: "asset-overview",
    }),
    route("inventory/list", "routes/inventory-list.tsx", {
      id: "inventory-list",
    }),
    route("inventory/detail", "routes/inventory-detail.tsx", {
      id: "inventory-detail-default",
    }),
    route("inventory/detail/:serialNumber", "routes/inventory-detail.tsx", {
      id: "inventory-detail",
    }),
    route("inventory/service-points", "routes/service-points.tsx", {
      id: "inventory-service-points",
    }),
    route("inventory/inbound", "routes/inbound-shipments.tsx", {
      id: "inbound-shipments",
    }),
    route("inventory/outbound", "routes/outbound-deliveries.tsx", {
      id: "outbound-deliveries",
    }),
    route("inventory/archive", "routes/asset-archive.tsx", {
      id: "asset-archive",
    }),
    route("products/list", "routes/product-list.tsx", {
      id: "product-list",
    }),
    route("products/detail", "routes/product-detail.tsx", {
      id: "product-detail-default",
    }),
    route("products/detail/:productId", "routes/product-detail.tsx", {
      id: "product-detail",
    }),
    route(":parent/:child", "routes/placeholder.tsx", {
      id: "app-placeholder",
    }),
  ]),
] satisfies RouteConfig;
