# FixLook — izolované integračné overenie (14. 11. 2026)

## Rozsah a bezpečnostné hranice

Overenie prebehlo len na vetve `fix/audit-p0-middleware-commission`, commit `6bd96f59ce66aee36f7778c28926427f87b7655a`, v krátkodobom Vercel Sandboxe so zdrojmi z GitHubu. Sandbox nemal produkčné Supabase ani Stripe kľúče. Produkčný Supabase, Stripe, Vercel Production a vetva `master` neboli zmenené.

### Výsledky — skutočne vykonané
- `npm ci` — **PASS**, čistá inštalácia.
- `npm run lint` — **PASS**.
- `npm run typecheck` — **PASS**.
- `npm test` — **PASS 32/32**.
- `npm run build` — **PASS**.
- `npm audit` — **PASS, 0 hlásených zraniteľností v okamihu testu**.
- PGlite databázové integračné testy: vytvorenie objednávky, pridelenie overeného majstra, cenové ponuky, výslovný súhlas zákazníka, 15 % provízia iba z práce, samostatné schválenie práce navyše, zablokovanie neoprávnených rolí, chat, izolácia údajov, simulované účtovanie a refundácia — **PASS v izolovanej databáze**.
- Stripe SDK podpis: lokálne podpísaný testovací event sa verifikuje, zmenený payload sa odmietne — **PASS bez sieťových požiadaviek**. Toto nie je test reálneho Stripe webhook doručenia do FixLook.

### Zistenia — čo bráni skutočnému HTTP E2E testu

1. Supabase nemá žiadnu samostatnú vývojovú vetvu. Nová vetva by stála **0,01344 USD/h**, samostatný projekt má od Supabase ponuku **0 USD/mesiac**. Pokus vytvoriť nový projekt `fixlook-integration-test-20261114` bol **odmietnutý požiadavkou na samostatné potvrdenie ceny (confirmation ID)**. Bez výslovného potvrdenia v konverzácii nebolo vytvorenie opakované.
2. Vercel projekt `fixlook`: potrebné aplikačné premenné vrátane Supabase a Stripe sú nastavené **iba pre Production**, nie pre Preview. Preview build `READY` nie je dôkaz funkčného prihlásenia ani integrácie.
3. Jediný nájdený Stripe testovací webhook endpoint je **povolený**, ale smeruje na `https://fixlook.vercel.app/api/stripe/webhook`, teda produkčnú doménu. Testovacie udalosti tam zámerne neboli poslané — mohli by spôsobiť zápis do existujúcej produkčnej databázy.
4. Stripe sandbox má `livemode=false`; pri čítaní v čase testu neboli v zozname posledných udalostí dostupné žiadne udalosti. **Nevytvorili sme žiadne Stripe Checkout session, platby ani refundácie.**
5. Privilegované produkčné RPC a pravidlá Storage neboli napádané aktívnymi požiadavkami proti produkcii. Existujúce PGlite testy sú užitočné, ale nenahrádzajú testy produkčného Supabase Auth, Storage API alebo HTTP webhooku.

## Odporúčané ďalšie kroky (bez zásahu do produkcie)

1. Po explicitnom schválení Supabase cenovej ponuky 0 USD/mesiac vytvoriť **samostatný projekt**, nie spoplatnenú vetvu, pokiaľ sa cena nezmení.
2. Najprv na testovacom projekte aplikovať migrácie `001_init.sql`, `002_quotes_messages_security.sql`, `20261008215530_ai_price_estimates.sql`, `20261114092802_commission_from_labor.sql`; nahradiť/oddeliť testovacie identity a dáta.
3. Pripraviť samostatnú konfiguráciu Vercel Preview viazanú len na pracovnú vetvu a výhradne na testovací Supabase ref. Pred testom overiť, že žiadny service-role kľúč nepatrí produkcii.
4. Pre Stripe zabezpečiť **oddelený testovací webhook endpoint na testovacej Preview URL** a oddelený podpisový secret; nemeňte existujúci webhook, kým to nie je schválené.
5. Až potom cez HTTP a skutočné Stripe sandbox platby otestovať dva typy účtov, súhlas s ponukou, 15 % províziu len z práce, doplatok, idempotentnosť webhooku a refundáciu.
6. Overiť izoláciu prihlasovania, fotografií, komunikácie a obnovenia hesla. Zaznamenať logy a prípadné chyby.

## Stav spustenia
**NO-GO pre produkciu**, kým nie je skutočný test celého toku v oddelenom prostredí, kontrola bezpečnosti a schválenie nasadenia.
