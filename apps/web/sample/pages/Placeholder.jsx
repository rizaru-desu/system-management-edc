import { useParams } from "react-router-dom";
import { Construction, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Placeholder() {
  const params = useParams();
  const parent = params.parent || "Module";
  const child = params.child || "Page";
  const title = child.replace(/([A-Z])/g, " $1").trim();

  return (
    <div className="animate-fade-up" data-testid="placeholder-page">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8] mb-2">
        {parent.replace(/([A-Z])/g, " $1").trim()}
      </p>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-[#0E2748] tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-sm text-[#0E2748]/60 max-w-xl">
        This module is part of the EDC.OS console blueprint. The interface for{" "}
        <span className="font-semibold text-[#0E2748]">{title}</span> will be wired up in the next iteration.
      </p>

      <div className="mt-8 max-w-2xl rounded-2xl border border-[#DDE0EC] bg-white p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#3F6FA8]/10 blur-2xl" />
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-[#0E2748] text-white flex items-center justify-center mb-4">
            <Construction className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h3 className="font-display text-xl font-semibold text-[#0E2748] mb-2">
            Coming up next.
          </h3>
          <p className="text-sm text-[#0E2748]/70 leading-relaxed mb-5">
            We are scaffolding the navigation and role-based access first. Once the shell is approved, each module here will host its tables, filters, forms and live data feeds.
          </p>
          <div className="flex gap-2">
            <Button className="bg-[#0E2748] hover:bg-[#3F6FA8] text-white">
              <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Request module
            </Button>
            <Button variant="outline" className="border-[#DDE0EC] bg-white text-[#0E2748] hover:bg-[#DDE0EC]/40">
              View specs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
