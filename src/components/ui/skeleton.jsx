// Loading placeholders shaped like the content they stand in for (shadcn/ui pattern, owned code).
import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** A page-shaped placeholder: a title, then cards with a heading and lines. */
export function PageSkeleton({ label = "Loading", cards = 2 }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border bg-surface p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A list-shaped placeholder: rows like a session or patient list. */
export function ListSkeleton({ label = "Loading", rows = 3 }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="divide-y rounded-lg border bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}
