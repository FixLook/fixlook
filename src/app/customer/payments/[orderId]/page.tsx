import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { uuidSchema } from "@/lib/validators";
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  await requireProfile("customer");
  const { orderId } = await params;
  redirect(uuidSchema.safeParse(orderId).success ? `/customer/orders/${orderId}` : "/customer/dashboard");
}
