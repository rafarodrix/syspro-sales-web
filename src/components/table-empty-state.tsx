import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

export function TableEmptyState({
  colSpan,
  title,
  description,
  action,
}: {
  colSpan: number;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-1.5 text-muted-foreground">
          <Inbox className="mb-1 size-5" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {description ? <span className="text-xs">{description}</span> : null}
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
