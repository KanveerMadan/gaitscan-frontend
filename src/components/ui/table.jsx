import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export const TableHeader = (props) => <thead {...props} />;
export const TableBody = ({ className, ...props }) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);
export const TableRow = ({ className, ...props }) => <tr className={cn("border-b", className)} {...props} />;
export const TableHead = ({ className, ...props }) => (
  <th className={cn("h-9 px-3 text-left text-xs font-medium text-muted-foreground", className)} {...props} />
);
export const TableCell = ({ className, ...props }) => (
  <td className={cn("px-3 py-2.5 align-top", className)} {...props} />
);
