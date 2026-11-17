import { proposeScheduleAction, respondToScheduleAction } from "@/actions/schedule";
import { formatDateTime } from "@/lib/utils";
import type { UserRole, OrderStatus } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Schedule = {
  proposed_start: string;
  duration_minutes: number;
  previous_start: string | null;
  previous_duration_minutes: number | null;
  status: "proposed" | "confirmed";
};

export function OrderScheduleCard({ role, orderId, status, preferred, schedule }: {
  role: UserRole;
  orderId: string;
  status: OrderStatus;
  preferred: string | null;
  schedule: Schedule | null;
}) {
  const open = ["assigned", "accepted", "in_progress"].includes(status);
  return <Card>
    <CardHeader><CardTitle>Termín práce</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="text-sm">
        <span className="text-muted-foreground">Preferencia zákazníka: </span>
        <strong>{formatDateTime(preferred)}</strong>
      </div>
      {schedule ? <div className="rounded-xl border bg-accent p-4 space-y-2">
        <p className="font-semibold">
          {schedule.status === "confirmed" ? "Termín potvrdený oboma stranami" : "Návrh termínu – čaká na zákazníka"}
        </p>
        <p className="text-sm">{formatDateTime(schedule.proposed_start)} · približne {schedule.duration_minutes} minút</p>
        {schedule.status === "proposed" && schedule.previous_start && <p className="text-sm font-medium text-amber-900">Doteraz potvrdený termín {formatDateTime(schedule.previous_start)} zostáva rezervovaný, kým zákazník neschváli zmenu. Odmietnutím nového návrhu sa zachová pôvodný termín.</p>}
        {schedule.status === "confirmed" && <p className="text-xs text-muted-foreground">Tento čas je rezervovaný. Zmenu termínu musí zákazník znovu potvrdiť.</p>}
      </div> : <p className="text-sm text-muted-foreground">Záväzný termín ešte nie je potvrdený. Termín uvedený v požiadavke je iba preferencia.</p>}
      {role === "customer" && open && schedule?.status === "proposed" &&
        <form action={respondToScheduleAction} className="space-y-3">
          <input name="orderId" type="hidden" value={orderId}/>
          <p className="text-sm">Vyhovuje vám tento čas? Potvrdením sa termín rezervuje. Ak ho odmietnete, zachová sa pôvodný potvrdený čas (ak existuje), inak majster môže poslať nový návrh.</p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton name="decision" value="accept">Potvrdiť termín</SubmitButton>
            <SubmitButton name="decision" value="reject" variant="outline">Navrhnúť iný čas</SubmitButton>
          </div>
        </form>}
      {role === "master" && open && <form action={proposeScheduleAction} className="space-y-3 rounded-xl border p-4">
        <input name="orderId" type="hidden" value={orderId}/>
        <p className="font-medium text-sm">{schedule ? "Navrhnúť zmenu termínu" : "Navrhnúť presný termín zákazníkovi"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`schedule-start-${orderId}`}>Dátum a začiatok (slovenský čas)</Label>
            <Input id={`schedule-start-${orderId}`} name="start" type="datetime-local" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`schedule-duration-${orderId}`}>Odhadované trvanie</Label>
            <Select id={`schedule-duration-${orderId}`} name="duration" defaultValue="120">
              {[30,60,90,120,150,180,240,300,360,480].map(minutes =>
                <option value={minutes} key={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}</option>
              )}
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Potvrdené termíny iných zákaziek sa kontrolujú automaticky. Nezáväzné požiadavky sa môžu časovo prekrývať, ale nemôžu sa prekrývať dva potvrdené termíny.</p>
        <SubmitButton pendingText="Odosielam návrh…">Poslať návrh termínu</SubmitButton>
      </form>}
      {role === "customer" && !schedule && open && <p className="text-sm text-muted-foreground">Ak potrebujete iný čas, napíšte majstrovi v chate. Majster vám potom pošle termín na potvrdenie.</p>}
    </CardContent>
  </Card>;
}
