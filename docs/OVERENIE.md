# Záznam overenia

Stav k 5. 10. 2026. Tento záznam odlišuje kontrolu kódu od overenia živej služby.

## Automatické kontroly

- ESLint a TypeScript bez chýb; automatická sada hlási 17 úspešných testov (vrátane nadradeného databázového testu).
- Testy cien v centoch, slovenského desatinného zápisu a termínov v pásme Europe/Bratislava vrátane nejednoznačného/neexistujúceho času pri zmene letného času.
- Databázové testy spúšťajú migrácie 001 a 002 v PGlite, s rolami `anon`, `authenticated`, `service_role` a testovacími schémami Auth/Storage.
- Kontrola zákazu zmeny roly, overenia majstra, cien a platobných stavov z klienta.
- Test reprodukuje ručne pridané verejné čítanie profilov z hostovanej databázy a overuje, že migrácia odoberie tento prístup aj priame volanie registračného triggera.
- Opakované vytvorenie objednávky s rovnakým identifikátorom požiadavky nevytvorí druhú objednávku.
- Iba administrátor môže prideliť overeného dostupného majstra.
- Nahradenie a odmietnutie cenových ponúk, nižšia cena a výslovný súhlas správneho zákazníka.
- Odmietnutie nesprávnej sumy/meny, opakované vyhodnotenie platby a zákaz druhého účtovania po nejasnom starom pokuse.
- Kontrola zhodného test/live režimu serverového Stripe kľúča vrátane obmedzených kľúčov; chýbajúci režim sa odmieta.
- Rozhodovanie o opakovaní zlyhanej platby nepripúšťa reset otvorenej relácie, spracúvanej ani zaplatenej platby. Volanie Stripe API a webhook zostávajú predmetom integračného testu.
- Práce navyše a zablokovanie dokončenia pri nevyriešených ponukách alebo platbách.
- Zachovanie pôvodnej zaplatenej sumy pri prácach navyše na starej objednávke.
- Súkromie chatov a podnetov, deduplikácia správ, neprečítané správy a uzavretie podnetu.
- Hodnotenie správneho majstra, monotónne refundácie, súkromné fotografie, limit počtu fotografií a ochrana zrušenia objednávky.

Testovacie schémy nenahrádzajú reálne Supabase Auth/Storage HTTP API ani Stripe API. Testy nepreukazujú prevádzkovú dostupnosť, doručenie e-mailu či úspešný prevod peňazí.

## Build a závislosti

Produkčný Next.js build bol overovaný v obmedzenom pracovnom prostredí. Bežný príkaz v tomto prostredí narazil na chýbajúce systémové údaje `/proc` (`uv_resident_set_memory`). Pri lokálnom overení bol preto vypnutý iba diagnostický zberač pamäte Next.js pomocou dočasného adaptéra mimo repozitára. Kontroly aplikácie, TypeScript ani generovanie stránok sa nevypínali. Adaptér nie je súčasťou projektu a pri bežnom hostingu sa nepoužíva.

Next.js a jeho ESLint konfigurácia boli aktualizované na kompatibilnú verziu 15.5.27; lockfile obsahuje aj kompatibilné bezpečnostné aktualizácie závislostí. Stripe SDK je pripnuté na 23.0.0 a požiadavky na API verziu `2026-09-30.endive`; nebol zmenený predvolený API režim pripojeného účtu. Produkčný `npm audit --omit=dev` pri overení nehlásil zraniteľnosti. Ide o stav auditu v danom čase, nie záruku celkovej bezpečnosti.

Úplný audit vrátane vývojových nástrojov stále hlásil 7 položiek s vysokou závažnosťou v reťazci závislostí okolo `braces` cez Tailwind CSS 3 a ESLint konfiguráciu. Neboli skryté ani automaticky opravované nekompatibilným major upgrade. Pred verejným release treba posúdiť riziko build prostredia a pripraviť samostatný overený upgrade nástrojov; nevykonávať build nad nedôveryhodnými vstupmi.

## Čo zostáva neoverené

Čítanie pripojených služieb potvrdilo existujúce objednávky a platby, chýbajúcu migráciu 002, konfiguráciu Vercel iba pre produkčné prostredie a chýbajúci Stripe webhook endpoint. Historické dohľadané Stripe platby boli v sandboxe. Tieto čítania nie sú testom nového používateľského toku; nastavenia služieb sa pri tomto overení nemenili. Pred migráciou bola uložená samostatná záloha aplikačných dát a schémy mimo repozitára; nejde o úplnú zálohu Auth a konfigurácie Supabase a obnova ešte nebola overená.

- Na živej databáze nebola aplikovaná migrácia a neboli menené reálne objednávky.
- Nebola uskutočnená testovacia ani skutočná platba cez pripojený Stripe účet, refundácia alebo výplata.
- Neboli overené SMTP, doručenie registračného e-mailu a obnova hesla v nasadenom prostredí.
- V pracovnom prostredí nebol dostupný funkčný Chromium; pokus o stiahnutie prehliadača skončil poškodeným/neúplným archívom. Vizuálny test a celý používateľský tok v prehliadači preto neboli dokončené.
- Nebolo vykonané záťažové testovanie, externý bezpečnostný audit ani právne posúdenie prevádzky.
- Kód neimplementuje Stripe Connect, automatické výplaty, fakturáciu, push notifikácie ani e-mailové notifikácie správ.

Pred spustením dokončite [checklist nasadenia](NASADENIE.md) v skutočnom testovacom prostredí. Verejný release má zostať zablokovaný, kým nie sú vyriešené platby, výplaty, integračné testy a prevádzkové povinnosti.
