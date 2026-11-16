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
