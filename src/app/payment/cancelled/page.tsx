import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentCancelledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-accent px-4">
      <Card className="w-full max-w-lg bg-white text-center">
        <CardHeader>
          <CardTitle>Payment cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No charge was made. You can return to the order and try again.
          </p>
          <Button asChild>
            <Link href="/customer/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
