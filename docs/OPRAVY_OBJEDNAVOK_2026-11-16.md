# FixLook – opravy objednávkového procesu (16. 11. 2026)

## Implementované vo vetve `fix/audit-p0-middleware-commission`

1. **Termíny:** zákaznícky preferovaný čas je jasne nezáväzný. Majster môže navrhnúť presný čas a predpokladané trvanie (30–480 min); zákazník ho samostatne potvrdí alebo odmietne. Potvrdený čas je rezervovaný. Súbežná rezervácia rovnakého majstra je odmietnutá v PostgreSQL RPC, v transakcii uzamykanej podľa ID majstra. Časové hranice berú do úvahy trvanie, nielen rovnosť začiatku.
2. **Bezpečné preplánovanie:** pôvodne potvrdený termín ostáva rezervovaný pri novom návrhu, kým zákazník výslovne neprijme zmenu. Odmietnutím sa pôvodný termín obnoví. Pri zmene prideleného majstra alebo zrušení objednávky sa rezervácia odstráni. Existujúce objednávky nemajú spätne automaticky potvrdené termíny.
3. **Informácie pre majstra:** zoznam zobrazuje typ služby, mesto, zákazníkov preferovaný termín, odhad a upozornenie na duplicitnú preferenciu. To je iba upozornenie; akceptácia zákazky NIE JE potvrdením konkrétneho termínu.
4. **Cenová ponuka:** klientsky formulár počíta súčet práca + materiál + doprava, zobrazuje 15 % províziu iba z práce a podiel remeselníka pred vlastnými nákladmi. Presná cena vyžaduje schválenie zákazníka, práce navyše zostávajú samostatne schvaľované. Starý, nepoužívaný 20 % helper v Stripe knižnici je odstránený.
5. **Chat:** po úspešnom odoslaní správy sa zobrazí spätná väzba, aby oneskorené obnovenie nevzbudzovalo dojem straty. Polling zostáva zachovaný; push/e-mail notifikácie nie sú súčasťou tejto opravy.
6. **Administrátor:** administrátorský zoznam ukazuje preferovaný termín. Kód a RPC pre priraďovanie existujú. Pri prvom audite administrátorský účet chýbal; **záverečná read-only kontrola už zistila 1 produkčný profil s rolou `admin`**. Jeho vznik nebol súčasťou týchto opráv. Prideľovanie cez administračné UI s touto identitou ešte treba E2E overiť; postup obnovy je v `docs/ADMIN_ACCESS_RECOVERY.md`. Konkrétny účet musí výslovne určiť prevádzkovateľ; žiadne povýšenie konta na produkcii sa nevykonalo.

## Migrácie pripravené vo vetve, otestované iba na oddelenom testovacom Supabase

- `20261114092802_commission_from_labor.sql`: 15 % z práce (schválená obchodná politika).
- `20261114115000_restrict_anon_admin_rpc.sql`: zamedzenie anonymného `is_admin`.
- `20261116190000_order_schedule_confirmation.sql`: schvaľované termíny, roly a ochrana kolízií.
- `20261116203000_schedule_cleanup_on_reassign.sql`: odstránenie neplatných rezervácií.
- `20261116214000_preserve_appointments_during_reschedule.sql`: potvrdený čas ostáva rezervovaný pri zmene návrhu.

**Žiadna z týchto migrácií nie je aplikovaná v produkcii.** Migrácie je pred nasadením potrebné skontrolovať spolu s aktuálnym stavom produkcie, backupom, rollbackom a schválením.

## Skutočné testy posledného pracovného commitu

V izolovanom Vercel Sandboxe:
- `npm ci`: PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: **34/34 PASS**
- `npm run build`: PASS
- `npm audit`: **0 nahlásených zraniteľností** v okamihu testu

Testovacie DB scenáre: dve objednávky na rovnaký čas, potvrdenie jednej a odmietnutie kolízie druhej, nová rezervácia posunutého času, zamietnutie neoprávnených rolí, zrušenie objednávky, prepridelenie remeselníka, zachovanie pôvodnej rezervácie počas návrhu zmeny a jej obnovenie po odmietnutí. Na oddelenom hosted test Supabase boli overené migrácie a základné potvrdenie, kolízia a návrat k pôvodnému termínu.

## Čo zostáva

- Vytvorenie administrátorskej identity **iba na základe výslovného schválenia konkrétneho vlastníckeho účtu**; potom otestovať administrátorské UI.
- Úplné browser E2E objednávky a dohodnutého termínu na novom Preview po migráciách, s kontrolovanými testovacími Auth účtami.
- Skutočné Stripe Checkout, webhook a refundácia v odizolovanom testovacom prostredí; nikdy na produkčnom webhooku.
- Priebežné upozornenia e-mailom/push, calendar sync a meranie času obsluhy – funkcie na ďalšiu iteráciu.

**Stav: pripravené na revíziu v PR, nie na produkčné spustenie.** `master`, produkčná databáza, existujúce objednávky a Stripe zostali pri tejto implementačnej etape bez zmeny.
