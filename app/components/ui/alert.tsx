import * as React from "react";

import { cn } from "~/lib/utils";

type AlertVariant = "default" | "destructive";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-border bg-muted/40 text-foreground",
  destructive: "border-rose-200 bg-rose-50 text-rose-700",
};

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export { Alert };
