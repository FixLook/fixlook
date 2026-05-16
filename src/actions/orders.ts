"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { buildOrderNumber } from "@/lib/utils";
import { redirectWithError } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderSchema } from "@/lib/validators";

export async function createOrderAction(formData: FormData) {
  const profile = await requireProfile("customer");
  const parsed = orderSchema.safeParse({
    serviceId: formData.get("serviceId"),
    problemDescription: formData.get("problemDescription"),
    address: formData.get("address"),
    city: formData.get("city"),
    preferredDatetime: formData.get("preferredDatetime")
  });

  if (!parsed.success) {
    redirectWithError(
      "/customer/orders/new",
      parsed.error.errors[0]?.message ?? "Invalid order."
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("base_price")
    .eq("id", parsed.data.serviceId)
    .single();

  if (serviceError || !service) {
    redirectWithError("/customer/orders/new", "Selected service was not found.");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: buildOrderNumber(),
      customer_id: profile.id,
      service_id: parsed.data.serviceId,
      problem_description: parsed.data.problemDescription,
      address: parsed.data.address,
      city: parsed.data.city,
      preferred_datetime: parsed.data.preferredDatetime || null,
      estimated_price: service.base_price,
      status: "new"
    })
    .select("id")
    .single();

  if (orderError || !order) {
    redirectWithError("/customer/orders/new", orderError?.message ?? "Order was not created.");
  }

  const photoFiles = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);

  for (const file of photoFiles.slice(0, 5)) {
    const extension = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${profile.id}/${order.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("order-photos")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (!uploadError) {
      const { data } = supabase.storage
        .from("order-photos")
        .getPublicUrl(storagePath);

      await supabase
        .from("order_photos")
        .insert({ order_id: order.id, photo_url: data.publicUrl });
    }
  }

  revalidatePath("/customer/dashboard");
  redirect(`/customer/orders/${order.id}`);
}
