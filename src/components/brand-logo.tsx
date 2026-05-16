import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-bold text-dark", className)}
    >
      <span className="text-xl tracking-normal">
        FixL
        <span className="relative mx-0.5 inline-flex translate-y-0.5 gap-0.5">
          <span className="h-4 w-4 rounded-full border-2 border-primary" />
          <span className="h-4 w-4 rounded-full border-2 border-primary" />
        </span>
        k
      </span>
    </Link>
  );
}
