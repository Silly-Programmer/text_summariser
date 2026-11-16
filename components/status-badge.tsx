import { IN_PROGRESS, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "ready" || status === "done"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : IN_PROGRESS.includes(status)
          ? "bg-amber-50 text-amber-700"
          : "bg-secondary text-secondary-foreground";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", tone)}>{STATUS_LABEL[status] ?? status}</span>;
}
