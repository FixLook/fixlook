import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentCancelledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-accent px-4">
      <Card className="w-full max-w-lg bg-white text-center">
        <CardHeader>
          <CardTitle>Platba nedokončená</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Platbu ste nedokončili. Aktuálny stav nájdete v objednávke.
          </p>
          <Button asChild>
            <Link href="/customer/dashboard">Späť na prehľad</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
