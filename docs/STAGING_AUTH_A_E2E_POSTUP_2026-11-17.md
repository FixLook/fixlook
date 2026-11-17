# FixLook – bezpečné testovacie prihlasovanie do oddeleného Supabase
**Dátum:** 17. 11. 2026

## Prečo teraz test zákazníka/majstra neprešiel
Pracovný Vercel Preview používa **iba oddelený Supabase** ref `qbanxjoumugikkcbxons`. Produkčné účty `customer@test.com` a `master@test.com` nie sú v tomto projekte použiteľné. Registrácia s týmito adresami (a rovnako adresami v `example.com` / `example.invalid`) skončila `email_address_invalid`, pretože Supabase blokuje rezervované testovacie e-mailové domény.

Podľa oficiálnej dokumentácie Supabase je vstavané SMTP na hostovaných projektoch určené len pre členov Supabase organizácie; na viac príjemcov treba vlastné SMTP alebo Send Email hook. **Nič z toho sa na produkcii neaktivovalo.**

## Odporúčaný postup bez plateného poskytovateľa
1. Vlastník zvolí **dve e-mailové adresy, ku ktorým má prístup a ktoré podporuje existujúca e-mailová schránka**. Môže ísť o dve aliasové adresy so spoločným inboxom, ak doručovanie aliasov poskytovateľ naozaj podporuje. Nepoužívať náhodné cudzie e-maily ani rezervované domény.
2. V testovacom Supabase projekte otvoriť [Authentication – Users](https://supabase.com/dashboard/project/qbanxjoumugikkcbxons/auth/users). Ak vstavané SMTP nepovoľuje dané e-mailové adresy, použiť podporované Auth Admin rozhranie na vytvorenie a **overenie účtov pod kontrolou vlastníka**, alebo výslovne nastaviť test-only SMTP. Ochranu potvrdenia e-mailu neznižovať v produkcii.
3. Pripraviť jeden účet s rolou `customer`, druhý s rolou `master`; overiť, že v `public.profiles` existuje každá identita pod správnym UUID a rolou. Správcovskú rolu cez používateľský profil nenastavovať automaticky.
4. Len pre staging overiť remeselníka (`public.masters.verified`) cez dôveryhodný admin postup. Vytvoriť samostatného staging administrátora cez kontrolovanú identitu (ak treba preveriť prideľovanie).
5. Heslá vytvoriť silné a jedinečné, nezdieľať ich v chate ani v GitHube. Počas testov ich uložiť do schváleného lokálneho secrets managera alebo dôveryhodného E2E test runnera. `SUPABASE_SERVICE_ROLE_KEY` nikdy nezverejniť v prehliadači.
6. Vercel Preview má **len branch-scoped** `NEXT_PUBLIC_SUPABASE_URL` a publikačný kľúč stagingu. Pred prvou objednávkou skontrolovať, že URL končí presne `qbanxjoumugikkcbxons.supabase.co`. Nikdy netestovať s produkčnou DB.

## Čo má E2E test po pripravení účtov preveriť

| Scenár | Očakávanie |
|---|---|
| Zákazník vytvorí syntetickú objednávku | Nový záznam iba v stagingu, nepatrí produkcii |
| Administrátor pridelí overeného majstra | Majstrovi sa objednávka zobrazí |
| Majster prijme a navrhne budúci termín | Zákazník vidí jasný návrh a trvanie |
| Zákazník potvrdí termín | Potvrdený čas je rezervovaný |
| Druhá zákazka na prekrývajúci sa čas | Potvrdenie sa odmietne |
| Majster pošle upravený termín | Pôvodný rezervovaný termín zostáva platný až do potvrdenia zmeny |
| Majster pošle ponuku | Priebežný súčet = práca + materiál + doprava, provízia 15 % iba z práce |
| Zákazník odmietne a majster upraví ponuku | História oboch ponúk zostáva viditeľná |
| Chat | Správa sa zobrazí obom rolám, bez prístupu cudzieho používateľa |
| Stripe test-only Checkout | Nepoužíva produkčný webhook ani živé kľúče, testovacie platby a refundácie zostávajú izolované |

## Nevykonané a dôvod
- **Reálne staged Auth login:** čaká na dve skutočne kontrolované adresy alebo na ich bezpečné založenie cez Admin Auth.
- **Klikací E2E zákazník/majster:** bez staged Auth účtov nie je možné bezpečne prejsť tieto stránky cez browser.
- **Stripe Checkout:** chýbajú testovacie serverové API kľúče. Testovací webhook je po smoke testoch deaktivovaný, produkčný je nedotknutý.

**Tento postup je pripravený na pokračovanie; v tejto fáze sa nevytvorili nové náhodné identity ani produkčné objednávky.**
