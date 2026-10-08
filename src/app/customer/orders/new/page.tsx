import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/order-form";
import { Notice } from "@/components/notice";
import { isAiEstimateEnabled } from "@/lib/ai-estimate-server";
export default async function NewOrderPage() {
  const profile = await requireProfile("customer");
  const db = await createServerSupabaseClient();
  const { data: services, error } = await db.from("services").select("*").eq("active",true).order("name");
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-bold">Nová objednávka</h1><p className="mt-1 text-muted-foreground">Opíšte problém a pridajte fotografie. Presnú cenu schválite po posúdení majstrom.</p></div><Card><CardHeader><CardTitle>Čo potrebujete opraviť?</CardTitle><CardDescription>Administrátor vám pridelí overeného majstra. Podrobnosti si dohodnete v chate.</CardDescription></CardHeader><CardContent><Notice error={error ? "Služby sa nepodarilo načítať. Skúste stránku obnoviť." : undefined} /><OrderForm services={services ?? []} profileId={profile.id} city={profile.city ?? "Košice"} aiEnabled={isAiEstimateEnabled()} /></CardContent></Card></div>;
}
