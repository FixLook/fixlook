"use server";

import { publicError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { redirectWithError } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validators";

export async function updateProfileAction(formData: FormData) {
  const profile = await requireProfile();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    city: formData.get("city")
  });

  if (!parsed.success) {
    redirectWithError(`/${profile.role}/profile`, parsed.error.errors[0]?.message ?? "Skontrolujte údaje profilu.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      city: parsed.data.city
    })
    .eq("id", profile.id);

  if (error) {
    redirectWithError(`/${profile.role}/profile`, publicError(error));
  }

  revalidatePath(`/${profile.role}/profile`);
}
