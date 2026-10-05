export function moneyToCents(value: unknown): number {
  const text = typeof value === "string" ? value.trim().replace(",", ".") : String(value);
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) throw new Error("Zadajte cenu s najviac dvomi desatinnými miestami.");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 10000000) throw new Error("Cena môže byť najviac 100 000 €.");
  return cents;
}

export function bratislavaDateTime(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Neplatný termín.");
  const nominal = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(nominal)) throw new Error("Neplatný termín.");
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bratislava", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const matches = [1, 2].map(offset => new Date(nominal - offset * 3600000)).filter(date => formatter.format(date).replace(" ", "T") === value);
  if (matches.length !== 1) throw new Error("Tento čas je pri zmene letného času neplatný alebo nejednoznačný. Vyberte iný termín.");
  return matches[0].toISOString();
}
