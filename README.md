# FixLook

Platforma na objednávanie elektrikárov a inštalatérov s overenými majstrami, schvaľovanými cenovými ponukami a komunikáciou priamo pri zákazke.

## Čo aplikácia obsahuje

- Slovenské rozhranie pre zákazníka, majstra a administrátora.
- Orientačné cenové rozpätie služby. Skutočná ponuka môže byť nižšia aj vyššia; zákazník najprv schvaľuje konkrétny rozsah a rozpis práce, materiálu a dopravy.
- História ponúk, odmietnutie s poznámkou a samostatné schvaľovanie aj platenie prác navyše.
- Chat zákazník – aktuálne pridelený majster pri objednávke, prístupný aj administrátorovi.
- Súkromné podnety zákazníka alebo majstra administrátorovi. Druhá strana objednávky ich nevidí.
- Neprečítané správy, stránkovanie a priebežné načítavanie správ. Chat sa kontroluje každých 5 sekúnd, navigácia a detail objednávky každých 15 sekúnd pri otvorenej stránke; nejde o push ani e-mailové upozornenia.
- Najviac 5 súkromných fotografií na objednávku, každá do 5 MB (JPEG, PNG, WebP). Fotografie sa nahrávajú priamo do Supabase Storage.
- Registrácia, potvrdenie e-mailu, obnova hesla a slovenské e-mailové šablóny.
- Oprávnenia a rozhodujúce prechody stavov kontrolované aj v databáze, nie iba v rozhraní.

## Priebeh zákazky

1. Zákazník vytvorí objednávku s orientačným cenovým rozpätím.
2. Administrátor pridelí overeného a dostupného majstra.
3. Majster objednávku prijme; v chate upresní rozsah alebo dohodne obhliadku.
4. Majster odošle ponuku. Zákazník ju schváli alebo odmietne.
5. Zákazník zaplatí schválenú ponuku cez Stripe Checkout.
6. Práce navyše vyžadujú novú ponuku, výslovné schválenie a samostatnú úhradu.
7. Majster dokončí zákazku až po vyriešení všetkých ponúk a platieb; zákazník môže pridať hodnotenie.

Už schválená cena sa neprepisuje. Zníženie už zaplatenej sumy rieši podpora refundáciou v Stripe Dashboard; aplikácia synchronizuje refundovanú sumu. Pred schválením ponuky môže zákazník objednávku zrušiť sám, neskôr kontaktuje podporu.

Pôvodná provízia **20 %** zostáva zachovaná ako výpočtová evidencia. Aplikácia neobsahuje automatické vyplácanie majstrov, Stripe Connect ani automatickú fakturáciu. Spôsob výplat a zúčtovania musí prevádzkovateľ vyriešiť pred ostrou prevádzkou.

## Technológie a lokálne spustenie

Next.js 15, React 19, TypeScript, Tailwind CSS 3, Supabase Auth/PostgreSQL/Storage a Stripe Checkout. Použite podporovanú verziu Node.js 22 alebo 24.

```bash
npm ci
cp .env.example .env.local
# Doplňte vlastné hodnoty do .env.local.
npm run check:config
npm run dev
```

Nová databáza: aplikujte najprv `supabase/migrations/001_init.sql`, potom `002_quotes_messages_security.sql`.

Existujúca databáza: po zálohe a preverení starých platieb aplikujte **iba migráciu 002**, koordinovane s novou verziou aplikácie. **Neopakujte migráciu 001:** obnovila by pôvodné široké oprávnenia a verejné fotografie.

Voliteľné vzorové služby pridá `supabase/seed.sql` alebo `npm run seed`. Ukážkové ceny nie sú overený cenník pre prevádzku; upravte ich v administrácii. Seed neprepisuje existujúce služby.

## Overenie

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
npm run check:config -- --database
```

`npm run verify` postupne spustí lint, kontrolu typov, testy a build. Databázové testy vykonávajú skutočné migrácie v PGlite s testovacími schémami Auth a Storage. Nenahrádzajú integračný test nasadeného Supabase, doručenia e-mailov a Stripe.

- [Nasadenie, migrácia a checklist pred spustením](docs/NASADENIE.md)
- [Rozsah vykonaného overenia a obmedzenia](docs/OVERENIE.md)

Samotné zlúčenie kódu neznamená spustenie služby. Pred otvorením pre verejnosť je potrebné vykonať migráciu, nastaviť Stripe a SMTP, otestovať kompletný tok v testovacom prostredí a uzavrieť prevádzkové otázky.
