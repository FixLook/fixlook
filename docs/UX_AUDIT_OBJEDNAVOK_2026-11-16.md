# FixLook – UX a funkčný audit objednávok (16. 11. 2026)

**Prostredia:** produkčné účty iba na prihlásenie a čítanie obrazoviek; nové objednávky, ponuky a chatové správy sa simulovali **výlučne na oddelenom testovacom Supabase** `qbanxjoumugikkcbxons`. Nespúšťali sa skutočné platby ani AI odhady.

## Skutočne overené

- Dva dodané účty sa úspešne prihlásili cez Supabase Auth a cez produkčnú prihlasovaciu stránku (zákazník → `/customer/dashboard`, majster → `/master/dashboard`).
- Zákaznícky a majstrovský dashboard sa na 390 px nezalamovali horizontálne; zákaznícky formulár novej objednávky a chatové rozhranie boli dostupné.
- Produkčný zákaznícky testovací účet má dve dokončené objednávky; majster má tri pridelené, z toho jednu prijatú. Existujúce objednávky neboli zmenené.
- Mobilný zákaznícky formulár: služba, opis, adresa, mesto, **jeden preferovaný termín**, 0–5 fotografií, nezáväzný AI odhad (aktivovaný), odoslanie.
- Zákaznícky detail: opis, adresa, preferovaný termín, rozpis ceny/platby, história ponúk, fotografia, chat/podpora.
- Majstrovský zoznam obsahuje číslo, stav, opis, cenníkový odhad a dátum vytvorenia; **nezobrazuje priamo miesto ani preferovaný termín**. Až detail ich zobrazuje spolu s kontaktom zákazníka.
- Na testovacom PostgreSQL boli vytvorené dve objednávky s preferovaným termínom **20.11.2026 09:00**, pridelené tomu istému majstrovi a **obe boli prijaté**. Chýba obsadenosť a samostatná záväzná dohoda o termíne. Požiadavka s dátumom v minulosti bola databázou **správne zamietnutá**.
- Cenová ponuka: testovací majster zadal práca 30 €, materiál 6 €, doprava 20 €. Zákazník ju odmietol s poznámkou, majster poslal zrozumiteľnejší popis, zákazník schválil. **História zostala zachovaná**. Testovacia DB vytvorila 56 € pending payment, províziu FixLook 4,50 € (15 % iba z práce), podiel majstra 51,50 €. **Skutočná platba neprebehla.**
- Chat cez testovaciu DB: zákazník poslal otázku na termín, majster odpovedal protinávrhom. Obojstranný zápis fungoval, ale dohodnutý nový termín sa nezapísal do samostatného poľa objednávky.
- Produkčná DB bola prečítaná bez zápisu: `respond_to_quote` **stále** používa 20 % z `total_amount` (materiál + práca + doprava), čo je v rozpore so schválenou politikou. Oprava existuje iba v **nenasadenom** PR #4 a v testovacej DB.

## Identifikované zlepšenia (prioritizované)

### P0 – pred komerčným spustením
1. **Provízia v produkcii:** bezpečne aplikovať až po samostatnom schválení a zálohe fix 15 % výhradne z práce, potom otestovať cenu aj účtovanie.
2. **Termíny:** rozlíšiť `preferred_datetime` od záväzného `confirmed_datetime`; majster navrhne termín, zákazník ho potvrdí, obe strany vidia aktuálny plán. Pred potvrdením preveriť konflikty obsadenosti majstra. Súčasná akceptácia zákazky nie je rezervácia termínu.

### P1 – veľmi užitočné pre prvý košický pilot
3. **Majstrovský prehľad:** v karte zákazky ukázať obec/časové okno, naliehavosť, typ služby a dostupné fotografie; pri prijatí umožniť prejsť k návrhu termínu.
4. **Cenová ponuka:** priebežný súčet, odporúčané rozpísanie úkonov, predpokladaný čas práce, prípadná obhliadka, transparentnosť zahrnutých nákladov. Dnes len voľný text `scope` a 3 cenové sumy.
5. **Zárobok majstra:** v detaile uvádzať `cena práce – 15 % provízia + materiál + doprava = podiel majstra`; v dnešnej karte nie je explicitne zobrazená čistá suma ani provízia.
6. **Chat:** priamo v konverzácii umožniť poslať a potvrdiť návrh termínu/ponuku bez kopírovania do voľného textu, zrozumiteľné stavy doručenia a upozornenia mimo otvoreného webu. Teraz polling každých 5 sekúnd; v inboxe každých 15 sekúnd, bez doložených e-mail/push notifikácií.
7. **Zákaznícky formulár:** miesto jediného dátumu možnosť časového okna (napr. dopoludnia/popoludní), naliehavosť, dostupnosť adresy/parkovania a doplňujúce otázky podľa služby. Povinné minimum treba udržať krátke, aby neklesala konverzia.
8. **Cenníkový odhad:** pri aktivovanom AI nie je základná cenníková suma v rozbaľovacom poli služby; odhad nie je záruka. Príklady v Košiciach ukazujú výrazné rozdiely podľa výjazdu/diagnostiky a rozsahu, preto nehodnotiť sumu bez popisu práce.

### P2 – neskôr
9. Mobilné ovládanie chatovej konverzácie, prílohy v chate, filtrovanie zákaziek podľa termínu/stavu, kalendár majstra, voliteľné notifikácie.
10. UX priechod prvou objednávkou s 3–5 skutočnými pilotnými zákazníkmi a remeselníkmi, meranie času do ponuky a dokončenia.

## Hranice overenia
- **Neurobili sme úplné browser E2E** vytvorenie objednávky → admin pridelenie → majster prijatie → schválenie ponuky → skutočná Stripe test platba. Pre úplný test treba oddelené skutočné Auth účty a bezpečnú konfiguráciu testovacieho Stripe Checkout.
- Niektoré UX zistenia vychádzajú z presného kódu a z čítania webových obrazoviek, nie z fyzického pozorovania používateľov.
- AI odhad sa počas UX auditu nespúšťal, aby sa nevytvárali dodatočné náklady.
- **Žiadne produkčné objednávky, ponuky, platby ani chatové správy sa nezmenili.** Prihlásenie do dodaných testovacích účtov mohlo štandardne vytvoriť produkčné Auth sessions a záznam o poslednom prihlásení. Testovacie heslá sa nezapisovali do dokumentácie ani repozitára.

## Priamy E2E test hlavného webu – produkčné testovacie účty (16. 11. 2026)

**Povolenie:** prevádzkovateľ výslovne schválil vytvorenie a úpravy testovacích objednávok cez `customer@test.com` a `master@test.com` na `https://fixlook.vercel.app`. Heslá nie sú uložené v GitHube ani v tejto správe. **Toto je nový test, ktorý už menil iba označené TEST záznamy v produkčnom Supabase.**

### Vytvorené cez produkčný web
1. **FL-20261116-B321157DF9**, ID `3e3ac8ab-db22-4482-bab2-3335daecef9e`: Elektrikár, TEST neexistujúca adresa, preferovaný termín 20. 11. 2026 9:00.
2. **FL-20261116-B0F7600883**, ID `59b7b602-89c3-4f2c-bd36-9d9a2ef3c9a3`: Inštalatér, TEST neexistujúca adresa, **ten istý čas** 20. 11. 2026 9:00.

Obe požiadavky boli úspešne vytvorené kliknutím `Odoslať požiadavku` priamo na hlavnom webe z mobilného prehliadača (390 px). Web správne zobrazil ich opis, termín, orientačný odhad a stav `new`. **Bežný admin proces nebolo možné prejsť: v produkčnom `public.profiles` nie je žiadna rola `admin`.** Preto bolo vykonané **obmedzené kontrolované priradenie iba týchto dvoch TEST objednávok** SQL, s kontrolou zákazníka, stavu a overeného dostupného majstra; vytvorili sa k nim konverzácie. Tento krok nie je pozitívny test administrátorskej UI.

### Majster cez produkčný web
- `master@test.com` otvoril oba nové detaily s opisom, adresou a preferovaným termínom. Prijal obe cez tlačidlo **Prijať zákazku**. DB overila `status=accepted` u oboch.
- **Potvrdená funkčná chyba/produktový nedostatok:** dva rôzne joby na **rovnaký čas u toho istého majstra** boli bez upozornenia prijaté; systém zatiaľ nerezevuje ani nezamyká konkrétny čas.
- Zoznam majstra stále nezobrazuje požadovaný termín a lokalitu priamo v karte; až detail má kompletné informácie.

### Cenová ponuka cez produkčný web
- Majster poslal pre elektrikára ponuku **práca 25 €, materiál 6 €, doprava 10 €**, spolu **41 €**. Overená v `public.order_quotes` so stavom `proposed`.
- Zákazník otvoril túto ponuku na hlavnom webe. Potvrdilo sa zobrazenie sumy a akcií **Schváliť cenu 41,00 €** / **Odmietnuť a požiadať o úpravu**.
- Zákazník odmietol ponuku a pridal poznámku k chýbajúcemu rozpisu a trvaniu; DB potvrdila `status=rejected` a uložený dôvod.
- Majster následne odoslal druhú detailnejšiu ponuku s rozpisom diagnostiky a výmeny; cena zostala 41 €. Zákazník videl **novú aktívnu ponuku a históriu odmietnutej ponuky**.
- **Zámerne NEVYKONANÉ:** schválenie druhej ponuky a platba. Produkčná DB stále používa chybný vzorec **20 % z celej sumy** a prijatie by vytvorilo nesprávny platobný záznam. Na oboch TEST objednávkach je podľa záverečnej kontroly **0 platieb**.

### Chat cez produkčný web
- Zákazník cez webový chat poslal otázku na 9:00.
- Majster ju videl a cez web odpovedal protinávrhom **11:00**.
- Obe správy sú uložené v produkčnom `public.messages` **iba v TEST konverzácii**.
- V bezprostrednej kontrole po odoslaní sa správa majstra ešte nevykreslila v klientovi; po ďalšom načítaní však zákazník správu v chate **videl**. Nie je teda preukázaná strata správy, ale možné oneskorenie zobrazenia/obnovy.
- Preferovaný termín na objednávke zostal **9:00**, takže dohoda v chate sa nepromietla do plánovacieho údaja.

### Záverečný stav
- Obe nové produkčné TEST objednávky: **accepted** (prijaté), bez úhrad a bez vykonanej práce.
- Elektrikár: 2 ponuky (jedna odmietnutá, jedna čakajúca na rozhodnutie), 2 nesystémové správy, 0 platieb.
- Inštalatér: 0 ponúk, 0 platieb.
- **Žiadne iné zákaznícke objednávky sa nemenili.** Nevytvorili sa živé Stripe platby, refundácie ani AI požiadavky.
- **Závažná prevádzková prekážka:** na produkčnom projekte nie je admin profil pre štandardné priradenie remeselníka. Je nutné zodpovedne obnoviť administrátorský workflow, nie len prideliť majstra v SQL.
- Obe objednávky sú stále viditeľné testovacím účtom. Bez súhlasu ich neodstraňovať alebo neoznačovať za dokončené; možno ich zrušiť cez existujúce role/pravidlá až po rozhodnutí prevádzkovateľa.

**Upozornenie:** produkčná oprava provízie z PR #4 stále nie je nasadená a bezpečné platobné E2E vyžaduje oddelený Stripe sandbox Preview.
