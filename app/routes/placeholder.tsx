import { LuConstruction, LuSparkles } from "react-icons/lu";

import type { Route } from "./+types/placeholder";

export function meta({ params }: Route.MetaArgs) {
  const title = [params.parent, params.child]
    .filter(Boolean)
    .map((segment) => segment?.replace(/-/g, " "))
    .join(" / ");

  return [
    { title: `${title || "Module"} | EDC.OS` },
    { name: "description", content: "EDC.OS module placeholder." },
  ];
}

export default function Placeholder({ params }: Route.ComponentProps) {
  const title = [params.parent, params.child]
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, " "))
    .join(" / ");

  return (
    <div className="animate-fade-up flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-[#DDE0EC] bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDE0EC]/60 text-[#3F6FA8]">
          <LuConstruction className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
          Module workspace
        </p>
        <h1 className="mt-2 text-2xl font-bold capitalize tracking-tight text-[#0E2748]">
          {title || "Coming soon"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#0E2748]/60">
          This module is wired into the responsive shell and ready for the next
          workflow implementation.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#DDE0EC] px-3 py-1.5 text-xs font-medium text-[#0E2748]/70">
          <LuSparkles className="h-3.5 w-3.5 text-[#3F6FA8]" strokeWidth={1.75} />
          EDC.OS staging module
        </div>
      </div>
    </div>
  );
}
