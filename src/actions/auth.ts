"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dashboardPathForRole } from "@/lib/auth";
import { redirectWithError, redirectWithMessage } from "@/lib/form";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validators";
import type { UserRole } from "@/lib/database.types";

function adminClientOrNull() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createServiceSupabaseClient();
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirectWithError("/register", parsed.error.errors[0]?.message ?? "Invalid data.");
  }

  const { fullName, email, password, phone, city, role } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        city,
        role
      }
    }
  });

  if (error) {
    redirectWithError("/register", error.message);
  }

  if (!data.user) {
    redirectWithMessage("/login", "Account created. Check your email before signing in.");
  }

  const profilePayload = {
    id: data.user.id,
    full_name: fullName,
    email,
    phone,
    city,
    role: role as UserRole
  };
  const writeClient = adminClientOrNull() ?? supabase;
  const { error: profileError } = await writeClient
    .from("profiles")
    .upsert(profilePayload);

  if (profileError) {
    redirectWithError("/register", profileError.message);
  }

  if (role === "master") {
    const { error: masterError } = await writeClient
      .from("masters")
      .upsert({ profile_id: data.user.id }, { onConflict: "profile_id" });

    if (masterError) {
      redirectWithError("/register", masterError.message);
    }
  }

  revalidatePath("/", "layout");
  redirect(dashboardPathForRole(role));
}

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirectWithError("/login", parsed.error.errors[0]?.message ?? "Invalid data.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirectWithError("/login", error.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("email", parsed.data.email)
    .single();

  revalidatePath("/", "layout");
  redirect(dashboardPathForRole(profile?.role ?? "customer"));
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
