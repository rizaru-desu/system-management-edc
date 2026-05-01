import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error("Dialog components must be used inside <Dialog />");
  }

  return context;
}

function Dialog({
  open,
  onOpenChange,
  children,
}: React.PropsWithChildren<DialogContextValue>) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {children}
      </div>
    </DialogContext.Provider>,
    document.body,
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = useDialogContext();

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-primary/45"
        aria-label="Close dialog"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border bg-white shadow-2xl",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b border-border bg-background p-5", className)} {...props} />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border bg-white p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("mt-1 text-xl font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-foreground/60", className)} {...props} />;
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
