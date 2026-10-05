import { createRatingAction } from "@/actions/ratings";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CustomerRatingsPage() {
  const profile = await requireProfile("customer");
  const supabase = await createServerSupabaseClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", profile.id)
    .eq("status", "completed")
    .not("master_id", "is", null)
    .order("completed_at", { ascending: false });

  const { data: ratings } = await supabase.from("ratings").select("order_id,stars,comment").eq("customer_id", profile.id);
  const rated = new Map((ratings ?? []).map(rating => [rating.order_id, rating]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Hodnotenia</h1>
        <p className="mt-1 text-muted-foreground">
          Podeľte sa o skúsenosť po dokončení práce.
        </p>
      </div>

      <div className="grid gap-4">
        {(orders ?? []).map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle>{order.order_number}</CardTitle>
            </CardHeader>
            <CardContent>
              {rated.has(order.id) ? <div><p className="font-medium">Vaše hodnotenie: {rated.get(order.id)?.stars} z 5</p><p className="mt-2 text-sm">{rated.get(order.id)?.comment}</p></div> : <form action={createRatingAction} className="grid gap-4 sm:grid-cols-[160px_1fr_auto]">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="space-y-2">
                  <Label htmlFor={`stars-${order.id}`}>Počet hviezdičiek</Label>
                  <Select id={`stars-${order.id}`} name="stars" defaultValue="5">
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`comment-${order.id}`}>Komentár</Label>
                  <Textarea id={`comment-${order.id}`} name="comment" />
                </div>
                <div className="flex items-end">
                  <SubmitButton pendingText="Ukladám…">Odoslať</SubmitButton>
                </div>
              </form>}
            </CardContent>
          </Card>
        ))}
        {!orders?.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Zatiaľ nemáte dokončené objednávky na hodnotenie.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
