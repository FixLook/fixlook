import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="FixLook – úvodná stránka"
      className={cn("inline-flex w-fit shrink-0 items-center rounded-lg bg-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    >
      <span className="relative block h-[29px] w-[111px] overflow-hidden">
        {/* Display the supplied artwork at its native resolution, without its outer white margins. */}
        <Image
          src="/fixlook-logo.png"
          alt="FixLook"
          width={151}
          height={101}
          priority
          unoptimized
          className="absolute -left-5 -top-8 h-[101px] w-[151px] max-w-none"
        />
      </span>
    </Link>
  );
}
