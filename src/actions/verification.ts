"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireProfile } from "@/lib/auth";
import { redirectWithError, redirectWithMessage } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { masterVerificationSchema } from "@/lib/validators";

const destination = "/master/profile";
const mimeExtension: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png"
};

export async function submitMasterVerificationAction(formData: FormData) {
  const profile = await requireProfile("master");
  const parsed = masterVerificationSchema.safeParse({
    specialty: formData.get("specialty"),
    yearsExperience: formData.get("yearsExperience"),
    ico: formData.get("ico") ?? "",
    referencesText: formData.get("referencesText") ?? "",
    motivation: formData.get("motivation")
  });
  if (!parsed.success) redirectWithError(destination, parsed.error.issues[0]?.message ?? "Skontrolujte žiadosť.");

  const supabase = await createServerSupabaseClient();
  const { data: master, error: masterError } = await supabase.from("masters")
    .select("verified").eq("profile_id", profile.id).single();
  const { data: application, error: applicationError } = await supabase.from("master_verification_applications")
    .select("status").eq("master_id", profile.id).maybeSingle();
  if (masterError || applicationError || !master || master.verified ||
    application?.status === "pending" || application?.status === "approved") {
    redirectWithError(destination, "Túto žiadosť teraz nie je možné odoslať.");
  }

  const file = formData.get("document");
  let uploadedPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const extension = mimeExtension[file.type];
    if (!extension || file.size > 3 * 1024 * 1024) {
      redirectWithError(destination, "Príloha musí byť PDF, JPG alebo PNG a mať najviac 3 MB.");
    }
    // Files never use user-supplied filenames as their storage path.
    uploadedPath = `${profile.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("master-verification")
      .upload(uploadedPath, file, { contentType: file.type, upsert: false });
    if (uploadError) redirectWithError(destination, "Prílohu sa nepodarilo uložiť.");

    const { error: metaError } = await supabase.from("master_verification_documents").insert({
      master_id: profile.id,
      storage_path: uploadedPath,
      original_name: file.name.slice(0, 200) || "Príloha"
    });
    if (metaError) {
      await supabase.storage.from("master-verification").remove([uploadedPath]);
      redirectWithError(destination, "Prílohu sa nepodarilo priradiť k žiadosti.");
    }
  }

  const { error } = await supabase.rpc("submit_master_verification", {
    p_specialty: parsed.data.specialty,
    p_years: parsed.data.yearsExperience,
    p_ico: parsed.data.ico,
    p_references: parsed.data.referencesText,
    p_motivation: parsed.data.motivation
  });
  if (error) {
    if (uploadedPath) {
      await supabase.from("master_verification_documents").delete().eq("storage_path", uploadedPath);
      await supabase.storage.from("master-verification").remove([uploadedPath]);
    }
    redirectWithError(destination, "Žiadosť sa nepodarilo odoslať. Skúste to znova.");
  }
  revalidatePath(destination);
  revalidatePath("/admin/professionals");
  redirectWithMessage(destination, "Žiadosť bola odoslaná. Administrátor ju posúdi.");
}
