import { statusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  new: "bg-sky-50 text-sky-700",
  assigned: "bg-amber-50 text-amber-700",
  accepted: "bg-indigo-50 text-indigo-700",
  in_progress: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-rose-50 text-rose-700",
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  refunded: "bg-slate-100 text-slate-700"
};

export function StatusBadge({
  status,
  className
}: {
  status: string | null;
  className?: string;
}) {
  const value = status ?? "unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        statusStyles[value] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {statusLabels[value] ?? statusLabels.unknown}
    </span>
  );
}
