# FixLook – bezpečné obnovenie administrátorského účtu

**Stav:** návrh postupu, `master` ani produkčný Supabase neboli zmenené.

## Zistenie
Pri skoršej UX E2E kontrole 16.11.2026 nebol v produkčnej tabuľke `public.profiles` žiadny profil s rolou `admin`. **Záverečná čítacia kontrola už zistila jeden profil `admin`; nemožno ho považovať za vytvorený týmito opravami.** Tento postup sa preto aktuálne nemá vykonávať bez novej kontroly, kto je správcom. Namiesto toho treba otestovať existujúci administrátorský účet. Aplikácia už obsahuje chránené obrazovky `/admin/orders` a RPC `assign_master`, ale bez administrátorskej identity ich nie je možné štandardne používať. Testovacie objednávky sme počas auditu pridelili úzko obmedzeným SQL zápisom; takýto postup nie je vhodný pre dennú prevádzku.

## Čo je potrebné pred aktiváciou
1. Prevádzkovateľ musí **výslovne vybrať konkrétny vlastný e-mail a používateľský profil**, ktorý bude administrátorom.
2. Overiť identitu a vlastníctvo účtu cez Supabase Auth; účet musí mať potvrdený e-mail a silné jedinečné heslo, ideálne MFA.
3. Pripraviť databázový backup; uviesť dôvod, vykonávateľa a ID konkrétneho účtu.
4. V samostatnej transakcii a **až po schválení produkčnej zmeny** zmeniť rolu jediného overeného profilu cez dôveryhodnú Supabase SQL Console/admin API. Nikdy neakceptovať samoobslužnú zmenu roly z používateľského formulára alebo `raw_user_meta_data`.
5. Skontrolovať `is_admin()`, prihlasovanie do `/admin/orders`, prideľovanie iba overených dostupných majstrov a spätný audit. Testovať výhradne označené objednávky.
6. Záložnú administrátorskú identitu zavádzať až po samostatnom bezpečnostnom schválení; nepoužívať heslá z testovacích účtov.

**Neuvádzame pripravený SQL príkaz s natvrdo zakódovanou identitou**, kým prevádzkovateľ neurčí administrátorský účet a nepotvrdí produkčnú zmenu. Takto sa predchádza omylom v oprávneniach.

## Stav ostatných úprav
V PR #4 sú pripravené migrácie pre 15 % províziu výlučne z práce, zabezpečenie `is_admin()`, potvrdenie termínov, kontrolu kolízií a zachovanie pôvodnej rezervácie pri návrhu zmeny. Produkcia tieto migrácie zatiaľ nepoužíva.
