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
    route(":parent/:child", "routes/placeholder.tsx", {
      id: "app-placeholder",
    }),
  ]),
] satisfies RouteConfig;
