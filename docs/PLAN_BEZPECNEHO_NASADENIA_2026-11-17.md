# FixLook — plán zálohy, predprodukčnej kontroly a bezpečného nasadenia
**Vypracované:** 17. 11. 2026  
**Stav:** PR #4 / Draft / **NO-GO**. Tento dokument **nie je súhlas** s migráciou ani nasadením.

## 1. Prostredia a hranice

| Prostredie | Supabase ref | Účel | Povolené |
|---|---|---|---|
| Production | `pjpnbmtfvlemgecoycot` | Skutočné objednávky | Iba čítanie do ďalšieho výslovného schválenia |
| Staging | `qbanxjoumugikkcbxons` | Izolované syntetické dáta | Migrácie, testy a opravy |
| GitHub | `fix/audit-p0-middleware-commission` | Opravný návrh | Testovanie a úpravy |
| Vercel | branch Preview (nie Production) | Skúšobné zostavenie | SSO ochrana, výhradne staging premenné |

**Záverečný read-only stav produkcie:** 5 objednávok, 3 platby, 2 cenové ponuky, 1 profil s rolou `admin`. Počty sa musia overiť znova tesne pred zásahom; môžu sa zmeniť.

Existujúca produkcia má v `supabase_migrations` odlišnú históriu od názvov niektorých lokálnych súborov: `20261005202442 quotes_messages_security`, `20261008220358 ai_price_estimates`. **Nevykonávať slepo `supabase db push` ani `db reset` na produkcii**. Najprv zosúladiť migration history, schému a skutočné definície. Zabrániť opakovanému vykonaniu init/quotes/AI migrácií.

## 2. Povinná záloha pred akoukoľvek produkčnou DB zmenou

**Záloha zatiaľ nebola vykonaná ani overená.** V dostupných pripojených nástrojoch nie je zálohovací endpoint ani zabezpečený prenos celého dumpu. Nikdy neukladať produkčný dump, DB heslo alebo token do GitHubu, chatu, PR či Vercel build logov.

1. Overiť plán a reálne dostupné backupy projektu v **Supabase Dashboard → Database → Backups**. Na Free nie sú automatické denné backupy; pri Pro/Team/Enterprise existujú denné backupy, ale na obnovenie produkcie stále treba vyhodnotiť bod obnovy.
2. Nezávisle vytvoriť **logický export produkcie** cez oficiálny Supabase CLI v dôveryhodnom lokálnom prostredí vlastníka, používajúc DB connection string uložený výhradne vo vlastnom secrets manageri. Príkazy z oficiálneho postupu:
   ```bash
   # iba na dôveryhodnom počítači; DB_URL nenahrádzať údajmi v GitHube
   supabase db dump --db-url "$PRODUCTION_DB_URL" -f roles.sql --role-only
   supabase db dump --db-url "$PRODUCTION_DB_URL" -f schema.sql
   supabase db dump --db-url "$PRODUCTION_DB_URL" -f data.sql --use-copy --data-only \
     -x "storage.buckets_vectors" -x "storage.vector_indexes"
   ```
   Pred použitím overiť aktuálnu syntax cez `supabase db dump --help`. Skontrolovať, či dump zachytáva požadované tabuľky/roly/schémy a či potrebuje osobitne export `auth` a `storage`.
3. Osobitne zazálohovať **objekty Storage** (nie iba SQL metadáta), súkromné fotografie a relevantnú konfiguráciu Auth. Supabase DB backup nezahŕňa samotné súbory uložené cez Storage API.
4. Vytvoriť šifrovanú, prístupovo obmedzenú off-site kópiu exportu; uchovať kontrolné súčty a čas vytvorenia.
5. **Obnovu otestovať na ďalšom izolovanom prostredí** iba so súhlasom s jeho prípadnými nákladmi. Bez úspešnej skúšky obnovy nie je backup dôveryhodne overený.
6. Pred spustením znovu zachytiť počty a kontrolné súčty relevantných tabuliek; pripraviť okno bez aktívnych zákazníckych platieb. Získať výslovný súhlas s produkčnými zmenami.

**Dôležité:** Obnovenie staršej zálohy môže stratiť objednávky, platby a správy vytvorené po nej. Neobnovovať produkciu automaticky, bez samostatného rozhodnutia. Použiť zálohu na obnovu len po analýze dát a stavu Stripe.

## 3. Presné poradie nových migrácií

Z repozitára v pracovnej vetve, **iba po schválení produkčného nasadenia a úspešnom backupe**:

1. `supabase/migrations/20261114092802_commission_from_labor.sql` — 15 % z ceny práce, konfigurácia 1500 bps, úprava `respond_to_quote`. Neprepočítava historické platby.
2. `supabase/migrations/20261114115000_restrict_anon_admin_rpc.sql` — obmedzenie `is_admin()` pre anonymnú rolu.
3. `supabase/migrations/20261116190000_order_schedule_confirmation.sql` — `order_schedules`, oprávnenia, návrhy a potvrdenie.
4. `supabase/migrations/20261116203000_schedule_cleanup_on_reassign.sql` — zrušenie neaktuálnych termínov pri zmene majstra alebo zrušení objednávky.
5. `supabase/migrations/20261116214000_preserve_appointments_during_reschedule.sql` — zachovanie pôvodného potvrdeného času pri návrhu zmeny.

**Pred aplikáciou**: prečítať posledné schémy/trigger definície na produkcii, overiť `to_regclass('public.order_schedules')`, `to_regclass('public.platform_commission_settings')`, prístupové práva a existenciu konfliktných mien. Preveriť súčasnú definíciu `respond_to_quote`, počet nezaplatených a rozpracovaných ponúk. V čase zmeny zamedziť schváleniu ponúk podľa starých pravidiel. Udržať konzistenciu schémy a aplikácie.

**Po aplikácii na produkcii (iba po súhlase)**:
- prepočet: práca 100 €, materiál 40 €, doprava 10 € → provízia 15 €; história platieb nesmie byť prepísaná;
- test prístupu anon/auth/admin/RLS;
- návrh, potvrdenie, kolízia, zmena a zamietnutie termínu;
- dostupnosť verejného katalógu a prihlásenia;
- kontrola Stripe sandbox (nie ostré platby) a schopnosť bezpečne stiahnuť Vercel deployment.

## 4. Poradie aplikácie a prevádzková kontrola

1. Revízia PR #4 a bezpečnostné schválenie konkrétneho commit SHA.
2. Záloha a skúška obnovy; stanovenie času údržby, kontaktných osôb a oznamu.
3. Finálne Preview E2E so skutočnými **staging** Auth účtami a Stripe test režimom. **Zatiaľ nie je hotové** (testovacie e-mailové účty odmieta Supabase `email_address_invalid`).
4. Zosúladiť migration history produkcie, schváliť presný SQL vykonávací plán.
5. Aplikovať iba novú schválenú migráciu/sekvenciu do produkcie s okamžitou verifikáciou každej zmeny.
6. Po úspešnej DB validácii pripraviť produkčný Vercel deployment so správnymi **produkčnými** env premennými, vykonať smoke test a až potom ho sprístupniť. Žiadne testové Supabase alebo Stripe kľúče v Production.
7. Monitorovať chyby objednávok, provízie, chat, konflikty termínov, prípadne pozastaviť nové objednávky pri kritickej chybe.

## 5. Rollback a incidenty

- **Vercel:** vrátiť aplikáciu na posledný overený produkčný deployment iba po kontrole kompatibility DB; starý kód musí vedieť ignorovať nové tabuľky. Nepoužívať automatické prepnutie bez kontroly.
- **PostgreSQL:** migračné zmeny sú prevažne aditívne; uprednostniť bezpečnú opravujúcu migráciu pred deštruktívnym `DROP`. Obnovenie backupu je posledná možnosť a vyžaduje osobitné schválenie (riziko straty novo vytvorených dát).
- **Stripe:** platby a refundácie sa nevracajú databázovým rollbackom; pri incidente treba zosúladiť ich ID a finančný stav s objednávkami bez duplikácie.
- **Termíny:** pri návrate na starší kód ponechať nové potvrdené rezervácie nedotknuté, nevymazávať ich automaticky. Vyhodnotiť nové rezervácie pred znovunasadením.
- **Komunikácia:** informovať testovací tím a nespúšťať skutočné platby, kým sa stav nezosúladí.

## 6. Akceptačné podmienky na GO

- [x] Izolované DB migrácie aplikované a integračne otestované.
- [x] Automatické testy, lint, typecheck, Next.js build predchádzajúcej etapy PASS.
- [x] Preview smoke test pri 390 a 1280 px – verejné stránky a ochrana súkromných trás.
- [ ] Skutočné prihlásenie dvoch kontrolovaných **staging** účtov a E2E potvrdenie termínu cez Preview.
- [ ] Bezpečný Stripe sandbox Checkout, podpísaný webhook a refundácia v Preview.
- [ ] Admin UI test prideľovania majstra s existujúcim admin účtom.
- [ ] Overená skutočná produkčná záloha **a skúška obnovy**, vrátane Storage.
- [ ] Bezpečnostná revízia privilegovaných RPC a produkčných migrácií.
- [ ] Schválenie `master` merge, produkčných DB migrácií a nasadenia majiteľom.

**Verdikt:** NO-GO. Dokument je pripravený na schválenie, nebol vykonaný produkčný backup ani produkčné nasadenie.
