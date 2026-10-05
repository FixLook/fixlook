"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { publicError } from "@/lib/errors";
import { getString, redirectWithError } from "@/lib/form";
import { uuidSchema } from "@/lib/validators";

export async function sendMessageAction(conversationId: string, body: string, clientId: string) {
  await requireProfile();
  if (!uuidSchema.safeParse(conversationId).success || !uuidSchema.safeParse(clientId).success) return { error: "Neplatná konverzácia." };
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("send_message", { p_conversation: conversationId, p_body: body, p_client: clientId });
  return error ? { error: publicError(error) } : { ok: true };
}
export async function markReadAction(conversationId: string, messageId: number) {
  await requireProfile();
  if (!uuidSchema.safeParse(conversationId).success || !Number.isSafeInteger(messageId) || messageId < 1) return;
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("mark_conversation_read", { p_conversation: conversationId, p_message: messageId });
  return error ? { error: publicError(error) } : { ok: true };
}
export async function createSupportAction(form: FormData) {
  const profile = await requireProfile();
  const path = `/${profile.role}/messages`;
  const db = await createServerSupabaseClient();
  const { data: id, error } = await db.rpc("create_support", { p_subject: getString(form, "subject"), p_body: getString(form, "body"), p_client: getString(form, "clientId"), p_order: getString(form, "orderId") || null });
  if (error || !id) redirectWithError(path, publicError(error));
  revalidatePath(path);
  redirect(`${path}/${id}`);
}
export async function setSupportStatusAction(form: FormData) {
  const profile = await requireProfile();
  const id = uuidSchema.safeParse(form.get("conversationId"));
  if (!id.success) redirectWithError(`/${profile.role}/messages`, "Neplatná konverzácia.");
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("set_support_status", { p_conversation: id.data, p_closed: form.get("closed") === "true" });
  if (error) redirectWithError(`/${profile.role}/messages/${id.data}`, publicError(error));
  revalidatePath(`/${profile.role}/messages`, "layout");
}
