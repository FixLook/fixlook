export function publicError(error: { message?: string; code?: string } | null | undefined) {
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "23505") return "Tento záznam už existuje. Obnovte stránku.";
  if (error?.code === "42501") return "Na túto operáciu nemáte oprávnenie.";
  if (error?.code === "invalid_credentials") return "Nesprávny e-mail alebo heslo.";
  if (error?.code === "email_not_confirmed") return "Najprv potvrďte e-mail cez odkaz v doručenej správe.";
  if (error?.code === "user_already_exists") return "Účet s týmto e-mailom už existuje. Prihláste sa.";
  if (error?.code?.includes("rate_limit")) return "Príliš veľa pokusov. Skúste to o chvíľu.";
  return "Operácia sa nepodarila. Skúste to znova alebo kontaktujte podporu.";
}
