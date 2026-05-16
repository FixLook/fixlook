import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";

export async function getCurrentProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireProfile(role?: UserRole) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (role && profile.role !== role) {
    redirect(`/${profile.role}/dashboard`);
  }

  return profile;
}

export function dashboardPathForRole(role: UserRole) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "master") {
    return "/master/dashboard";
  }

  return "/customer/dashboard";
}
