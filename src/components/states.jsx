// Shared states for lists and loads: a failed request (never shown as an empty list) and an empty one.
import { ArrowClockwise, Tray } from "@phosphor-icons/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// A request that failed: say so (never show it as an empty list) and offer to try again.
export function LoadError({ message, onRetry }) {
  return (
    <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwise aria-hidden />
          Try again
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
      <Tray size={28} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="max-w-[45ch] text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
