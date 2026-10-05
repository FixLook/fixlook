import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmCheckoutSession } from "@/lib/payments";

export default async function PaymentSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const profile = await requireProfile("customer");
  const { session_id: sessionId } = await searchParams;
  const result = sessionId
    ? await confirmCheckoutSession(sessionId, profile.id)
    : { ok: false as const, message: "Chýba odkaz na platbu." };

  return (
    <main className="flex min-h-screen items-center justify-center bg-accent px-4">
      <Card className="w-full max-w-lg bg-white text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>{result.ok ? "Platba potvrdená" : "Overujeme platbu"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {result.ok
              ? "Platba je zaznamenaná v objednávke. Podrobnosti realizácie si dohodnite s majstrom."
              : result.message ?? "Platba zatiaľ nie je potvrdená."}
          </p>
          <Button asChild>
            <Link href={result.ok ? `/customer/orders/${result.orderId}` : "/customer/dashboard"}>
              Späť do FixLook
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
