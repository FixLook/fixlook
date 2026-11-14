# FixLook – izolované integračné overenie MVP
**Dátum:** 14. november 2026  
**Stav:** pracovná vetva `fix/audit-p0-middleware-commission`, PR #4 (Draft), **bez produkčného nasadenia**.

## 1. Samostatné testovacie prostredie

- **Supabase testovací projekt:** `fixlook-integration-test-20261114`, ref `qbanxjoumugikkcbxons`, región `eu-west-1`, stav `ACTIVE_HEALTHY`.
- **Produkčný ref, na ktorý sa nesmie zapisovať:** `pjpnbmtfvlemgecoycot`.
- Schválená ponuka vytvorenia testovacieho projektu: **0 USD/mesiac**; nebol vytvorený priebežne spoplatnený Supabase branch.
- Testovací projekt je samostatný, bez kopírovania produkčných zákazníckych údajov.
- Úspešne vykonané migrácie **iba na testovacom projekte**: `001_init.sql`, `002_quotes_messages_security.sql`, `20261008215530_ai_price_estimates.sql`, `20261114092802_commission_from_labor.sql`, `20261114115000_restrict_anon_admin_rpc.sql`.
- 13 aplikačných tabuliek v `public` má RLS; testovacia konfigurácia provízie je **1500 basis points = 15 % výhradne z práce**. Bucket `order-photos` je súkromný.
- Dve syntetické služby a štyri syntetické používateľské profily boli vytvorené **iba v testovacej databáze**. Používatelia boli vložení SQL pre testovanie databázových rolí, **nie sú to overené účty pre reálne prihlasovanie cez Supabase Auth**.

## 2. Skutočne vykonané testy databázy a API

### Objednávkový tok – izolovaný PostgreSQL (PASS)

1. Zákazník vytvoril objednávku, administrátor pridelil overeného remeselníka, remeselník ju prijal.
2. Ponuka: **práca 100,00 €**, materiál 40,00 €, výjazd 10,00 €. Súčet 150,00 €. Zákazník explicitne schválil; platobný záznam obsahuje **províziu 15,00 €**, podiel remeselníka 135,00 €.
3. Cudzí zákazník ani remeselník nemohli schváliť zákazníkovu ponuku; cudzí zákazník nevidel objednávku ani platbu a nemohol prideliť remeselníka.
4. Po **simulovanom** potvrdení prvej platby: samostatná ponuka práce navyše 20,00 € + materiál 50,00 € + výjazd 5,00 € = 75,00 €. Zákazník ju schválil. Provízia z tejto ponuky je **3,00 €**.
5. Bez vybavenia dodatočnej ponuky nebolo možné dokončiť objednávku. Po **simulovanom** zaplatení aj druhej ponuky skončila objednávka `completed`, konečná cena **225,00 €**, celková provízia **18,00 €**.
6. Opakované potvrdenie rovnakej simulovanej Checkout relácie nespôsobilo druhú platbu.
7. Neoprávnený zákazník nesmel čítať ani posielať správy do cudzieho chatu; zákazník objednávky mohol poslať správu, pridelený remeselník ju videl.
8. Iba privilegovaná servisná rola mohla spustiť **simulovanú** čiastočnú refundáciu. Zákazník dostal pri pokuse `permission denied`.

**Dôležité:** `cs_test_fixlook_...` a `pi_test_fixlook_...` boli **syntetické identifikátory zapísané iba v testovacej databáze**. Stripe Checkout, skutočné platby, refundácie ani webhook doručenie sa **neuskutočnili**.

### Anonymné HTTP testy Supabase REST API (PASS)

- Verejný katalóg služieb: HTTP **200**, viditeľné 2 služby.
- Anonymné čítanie objednávok: HTTP **200**, viditeľných **0** záznamov.
- Anonymné volanie privilegovaného `is_admin()`: HTTP **401**.
- V SQL sa overilo, že `anon` nemá EXECUTE na `is_admin`, prihlásený administrátor ho môže volať a bežný zákazník dostáva `false`.

### Automatické testy a build (PASS)

Na commite `f52ac6d4feb839e0087a5b28a11cedab133f4acc` v izolovanom Vercel Sandboxe:
- Čistá inštalácia `npm ci` ✅
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm test` **33/33 úspešných** ✅
- `npm run build` ✅ (po rozšírení sieťového prístupu pre `fonts.googleapis.com` a `fonts.gstatic.com`)
- `npm audit` **0 hlásených zraniteľností k dátumu testu** ✅

## 3. Oddelenie Vercel Preview

Na existujúcom Vercel projekte sú pridané **výhradne branch-scoped Preview** premenné viazané na `fix/audit-p0-middleware-commission`:
- `NEXT_PUBLIC_SUPABASE_URL` → **testovací** Supabase projekt,
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → verejný testovací API kľúč,
- `AI_ESTIMATE_ENABLED=false`,
- `STRIPE_EXPECTED_MODE=test`.

**Produkčné environment variables neboli zmenené.** V Preview zatiaľ NIE JE nakonfigurovaný testovací `SUPABASE_SERVICE_ROLE_KEY`, ani Stripe test-only serverový a webhook kľúč. Preto toto Preview nie je pripravené na plnohodnotné platby a E2E test súkromných serverových operácií. Pri ďalšom Preview deploymente treba overiť skutočnú výslednú URL a konfiguráciu.

## 4. Stripe sandbox – rozsah a blokátory

- Existujúci Stripe účet je `livemode=false`, **sandbox**.
- Lokálny Stripe SDK test podpisu eventu prešiel (platný podpis akceptovaný, pozmenený payload odmietnutý). Tento test **neposielal sieťové volania**.
- Existujúci Stripe sandbox webhook smeruje na `https://fixlook.vercel.app/api/stripe/webhook`, teda **produkčnú doménu**. Neboli naň odoslané žiadne testovacie udalosti.
- Skutočné Stripe test Checkout sessions/platby/refundácie a následný HTTP webhook **NEBOLI vykonané**. Pred nimi je nutné vytvoriť samostatný test-only endpoint na bezpečnej Preview URL a nasadiť testovacie secret premenné iba do Preview.

## 5. Otvorené bezpečnostné upozornenia a zvyškové riziká

- `is_admin()` anon RPC opravené a overené na testovacom Supabase; nová migrácia ešte nebola aplikovaná na produkciu.
- Supabase Security Advisor: **21 upozornení** na `SECURITY DEFINER` funkcie prístupné autentifikovaným používateľom – viaceré sú zámerné aplikačné RPC s vnútornou autorizáciou, avšak každá vyžaduje osobitnú bezpečnostnú revíziu.
- `platform_commission_settings` má RLS bez politiky – **zámerne** neprístupná klientskym rolám (INFO).
- Testovací Supabase upozornil na nevynútenú **ochranu proti uniknutým heslám**; pred spustením treba preveriť Auth nastavenia.
- Pokusy o Supabase Auth registráciu so syntetickými e-mailovými doménami skončili `email_address_invalid`. **Skutočné prihlasovanie, registrácia, reset hesla a browser end-to-end test neprebehli**. Nepoužívali sa cudzie skutočné e-mailové adresy.
- HTTP test Storage API s reálnym session tokenom a test cez browser zatiaľ neprebehol.

## 6. Odporúčaný ďalší krok – stále bez produkcie

1. Vytvoriť v testovacom Supabase podporované testovacie prihlasovacie účty (s kontrolovanými testovacími e-mailmi).
2. Bez zdieľania hesiel alebo kľúčov v chate nastaviť testovací service-role kľúč **priamo v branch-scoped Vercel Preview** a overiť, že ref nikdy neukazuje na produkciu.
3. Pre Stripe nakonfigurovať samostatný **sandbox webhook** na izolovanú Preview URL, sandbox secret key a webhook signing secret (výhradne Preview). Produkčný endpoint ponechať nedotknutý.
4. Vykonať skutočný browser E2E a Stripe test-mode checkout + webhook + refundáciu, následne skontrolovať Stripe ↔ Supabase konzistenciu.
5. Dotiahnuť bezpečnostnú revíziu privilegovaných RPC, Storage a Auth nastavení; odovzdať na schválenie produkčnú migráciu s plánom zálohy a rollbacku.

**Záver: Draft PR #4 a NO-GO pre produkciu.** Žiadny merge do `master`, žiadna migrácia na produkčnej databáze, žiadne ostré platby.
