"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dashboardPathForRole } from "@/lib/auth";
import { redirectWithError, redirectWithMessage } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validators";
import { publicError } from "@/lib/errors";

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
    redirectWithError("/register", parsed.error.errors[0]?.message ?? "Skontrolujte zadané údaje.");
  }

  const { fullName, email, password, phone, city, role } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        full_name: fullName,
        phone,
        city,
        role
      }
    }
  });

  if (error) {
    redirectWithError("/register", publicError(error));
  }

  if (!data.session) {
    redirectWithMessage("/login", "Skontrolujte svoj e-mail a potvrďte registráciu cez doručený odkaz.");
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
    redirectWithError("/login", parsed.error.errors[0]?.message ?? "Skontrolujte zadané údaje.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirectWithError("/login", publicError(error));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user!.id)
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

export async function requestPasswordResetAction(formData: FormData) {
  const email = signInSchema.shape.email.safeParse(formData.get("email"));
  if (!email.success) redirectWithError("/forgot-password", "Zadajte platný e-mail.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password` });
  if (error) redirectWithError("/forgot-password", publicError(error));
  redirectWithMessage("/forgot-password", "Ak účet existuje, poslali sme na jeho e-mail odkaz na obnovu hesla. Skontrolujte aj nevyžiadanú poštu.");
}
export async function updatePasswordAction(formData: FormData) {
  const password = signUpSchema.shape.password.safeParse(formData.get("password"));
  if (!password.success) redirectWithError("/reset-password", password.error.errors[0]?.message ?? "Skontrolujte heslo.");
  if (password.data !== formData.get("confirmPassword")) redirectWithError("/reset-password", "Heslá sa nezhodujú.");
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirectWithError("/forgot-password", "Odkaz vypršal. Požiadajte o nový odkaz na obnovu hesla.");
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) redirectWithError("/reset-password", publicError(error));
  await supabase.auth.signOut({ scope: "global" });
  redirectWithMessage("/login", "Heslo bolo zmenené. Prihláste sa novým heslom.");
}
