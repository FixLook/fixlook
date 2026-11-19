# FixLook – Žiadosti o verifikáciu majstrov (2026-11-19)

## Cieľ
Voľná, nezáväzná registrácia majstra zostáva bez zmeny. Noví majstri sa nestávajú automaticky overenými a nebudú dostávať zákazky bez kontroly administrátorom. Existujúce overenia, objednávky, ponuky a platby sa nemigrujú ani neprepisujú.

## Implementované na pracovnej vetve
- V existujúcej stránke `/master/profile` môže neoverený majster poslať žiadosť s odborom, rokmi praxe, nepovinným IČO, referenciami a predstavením.
- Nepovinná príloha PDF/JPEG/PNG do 3 MB sa ukladá v neverejnom bucket-e `master-verification` pod náhodným názvom, nie pod názvom používateľského súboru.
- Prihlásený majster vidí stav žiadosti, odôvodnenie administrátora a vlastné prílohy; administrátor môže prílohy otvoriť cez krátkodobé podpísané URL.
- Administrátor vidí žiadosti v `/admin/professionals` a môže schváliť, vyžiadať doplnenie alebo zamietnuť. Negatívne rozhodnutia vyžadujú zdôvodnenie.
- Remeselník po zamietnutí či výzve na doplnenie môže žiadosť znova odoslať bez rušenia účtu.
- Schválenie nastaví `masters.verified=true`; prideľovanie objednávok aj naďalej vyžaduje `verified AND available`.
- Pri odobratí overenia sa účet nemení, dostupnosť sa vypne a žiadosť prejde do stavu, z ktorého je možné požiadať znova.
- Nové RPC a tabuľky sú chránené databázovými oprávneniami/RLS. Súbory nie sú verejné.
- Pred komerčným spustením doplniť pravidlá uchovávania a vymazávania dokladov (GDPR), proces manuálnej kontroly oprávnení a audit administrátorských rozhodnutí.

## Stav nasadenia a testovania
- Produkcia: **nenasadené** (ani schéma, ani UI).
- Test Supabase `qbanxjoumugikkcbxons`: migrácie aplikované, transakčné funkčné testy podanie → doplnenie → opätovné podanie → schválenie vykonané a vrátené späť.
- Lokálne izolované prostredie: 37/37 testov, ESLint, TypeScript a Next.js build úspešné.
- Prihlásený prehliadačový E2E odoslania dokumentu a rozhodovania: **ešte neoverený**. Vyskúšať pred nasadením.
- Chýba produkčná záloha/restore overenie. Pred nasadením migrácií explicitne posúdiť riziko, keďže produkcia beží na Free pláne.

## Akceptačný manuálny test
1. Nový majster sa registruje a vidí stav neoverený, bez pridelenia zákaziek.
2. Majster podá žiadosť bez prílohy, nemôže ju počas stavu čakajúca odoslať druhýkrát.
3. Nahrá súbor PDF alebo fotografiu do 3 MB; neprihlásený a cudzí majster nesmú vidieť prílohu.
4. Administrátor vyžiada doplnenie s odôvodnením; majster môže opraviť údaje a poslať znova.
5. Administrátor schváli; majster zostáva offline, kým nezapne dostupnosť.
6. Administrátor zruší overenie; prístup do účtu zostane, nové zákazky sú zablokované a majster môže podať ďalšiu žiadosť.
7. Existujúci overení majstri a objednávky zostávajú bez zmeny.
