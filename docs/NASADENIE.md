# Nasadenie FixLook

Tento postup je kontrolný zoznam pre prevádzkovateľa. Príprava kódu sama nespúšťa migráciu, platby ani verejný web. Najprv použite oddelené testovacie prostredie a Stripe test mode.

## 1. Existujúce dáta a koordinovaná migrácia

1. Zálohujte databázu aj fotografie. Overte obnovu zálohy v oddelenom projekte.
2. Zistite otvorené objednávky, staré nezaplatené platby a prípadné duplicitné Stripe identifikátory:

   ```sql
   select id, order_number, status, final_price
   from public.orders where status not in ('completed', 'cancelled');

   select id, order_id, amount, status, stripe_payment_intent_id
   from public.payments where status = 'pending';

   select stripe_payment_intent_id, count(*)
   from public.payments where stripe_payment_intent_id is not null
   group by stripe_payment_intent_id having count(*) > 1;
   ```

3. Počas prechodu zastavte vytváranie starých platobných relácií. Každú starú čakajúcu platbu porovnajte so Stripe; zaplatené platby musia byť správne zaevidované. Nezaplatené otvorené relácie ukončite až po overení ich skutočného stavu. Nevytvárajte náhradnú platbu len preto, že sa zákazník nevrátil na úspešnú stránku.
4. Odstránenie prípadných duplicít a vysporiadanie starých platieb vyžaduje konkrétny, skontrolovaný postup podľa reálnych dát. Migrácia ich automaticky nemaže ani nepredstiera súhlas zákazníka.
5. Na existujúcej databáze aplikujte **iba** `supabase/migrations/002_quotes_messages_security.sql`, presne raz. Na úplne novej databáze najprv `001_init.sql`, potom `002`.
6. Nasaďte nový kód v rovnakom servisnom okne. Stará aplikácia nie je po sprísnení oprávnení kompatibilná. Migrácia beží v transakcii; pri chybe nepokračujte čiastočnými príkazmi.
7. Pôvodné už uhradené platby sa zachovajú. Prípadné ďalšie práce sa schvaľujú ako nové ponuky a pôvodná suma ostáva v celkovom súčte. Staré čakajúce platby bez `quote_id` sa zámerne nedajú zaplatiť novým tokom bez vyriešenia podpory. Nový webhook tiež nepreberá staré relácie bez nových metadát.
8. Fotografie sa stanú súkromnými a staré verejné URL sa v metadátach prevedú na cesty. Už stiahnuté alebo uložené kópie to neodvolá.

Nikdy nepoužite opätovné spustenie `001` ako opravu: obnovilo by pôvodné oprávnenia. Návrat starej aplikácie vyžaduje koordinovaný návrat schémy a dát; pri nových platbách najprv posúďte ich zachovanie.

## 2. Supabase, prihlásenie a fotografie

- Nastavte `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` a serverový `SUPABASE_SERVICE_ROLE_KEY`. Servisný kľúč nikdy nedávajte do premennej s prefixom `NEXT_PUBLIC_`, do repozitára ani do klientského JavaScriptu.
- V Auth nastavte presnú Site URL aplikácie, povolenú adresu `/auth/callback` a callback s `?next=/reset-password` pre obnovu hesla. Testovacie a produkčné adresy musia smerovať do zodpovedajúcich prostredí.
- Zapnite potvrdenie e-mailovej adresy a vlastný SMTP server. Otestujte doručenie na adresy mimo tímu projektu, odosielateľskú doménu, spam aj limity Auth.
- Do šablón Confirm signup a Reset password skopírujte `supabase/templates/confirmation.html` a `recovery.html`. Nastavte slovenské predmety „Potvrďte registráciu vo FixLook“ a „Obnovenie hesla vo FixLook“. Šablóny používajú `TokenHash` cez `/auth/confirm`, aby sa dal odkaz otvoriť aj na inom zariadení.
- Úložisko `order-photos` musí byť súkromné, s limitom 5 MB a typmi JPEG, PNG, WebP. Prístup kontrolujú pravidlá migrácie. Overte reálne nahratie aj odmietnutie cudzieho prístupu cez Storage API, nielen SQL test.
- Po neúspešnom pripojení metadát môže zostať nahratý objekt bez záznamu fotografie. Takéto objekty riešte podporou po overení konkrétnej objednávky; nesprístupňujte celý bucket.
- Administrátora vytvorte ako bežný potvrdený účet. V dôveryhodnom SQL editore najprv vyhľadajte presné ID a e-mail, až potom vedome zmeňte rolu tohto konkrétneho účtu. Verejná registrácia rolu admin nepovoľuje.

  ```sql
  select id, email, role from public.profiles where email = 'vas-overeny-email';
  -- Po overení identity nahraďte KONKRETNE_UUID skutočným ID:
  -- update public.profiles set role = 'admin' where id = 'KONKRETNE_UUID';
  ```

- Majstrov overte v administrácii; na pridelenie musia byť zároveň dostupní. Nastavte reálne služby, odhady a prevádzkový región. Vzorový seed nie je schválený obchodný cenník.

Oficiálne podklady: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [e-mailové šablóny](https://supabase.com/docs/guides/auth/auth-email-templates).

## 3. Stripe a nejasný výsledok platby

1. Najprv nastavte `STRIPE_SECRET_KEY=sk_test_…`. Live kľúč použite až po schválení testovacieho toku a obchodného modelu. Hosted Checkout nepotrebuje v tejto aplikácii klientský publishable kľúč; historická premenná v `.env.example` je voliteľná.
2. Nastavte verejnú HTTPS adresu v `NEXT_PUBLIC_APP_URL`, bez koncového lomítka, cesty a parametrov.
3. Vytvorte endpoint `https://vasa-domena/api/stripe/webhook` a jeho vlastné `STRIPE_WEBHOOK_SECRET=whsec_…`. Aktivujte udalosti `checkout.session.completed`, `checkout.session.async_payment_succeeded` a `charge.refunded`.
4. Pri lokálnom teste môžete použiť `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Jeho podpisový secret nie je secret produkčného endpointu.
5. Otestujte zaplatenie, odmietnutie karty, zatvorenie Checkout, opakované kliknutie na Zaplatiť, opakované doručenie webhooku a oneskorený webhook. Samotný návrat na success URL nie je dôkazom platby; server kontroluje Stripe a vlastníctvo objednávky.

Platba je viazaná na konkrétnu schválenú ponuku. Server kontroluje sumu, menu, zákazníka, objednávku, pokus a Stripe reláciu. Pri chybe uloženia webhook vráti chybu, aby Stripe mohol doručenie zopakovať.

Ak po prerušení komunikácie chýba uložené ID relácie a pokus je starší než 23 hodín, aplikácia nový Checkout neotvorí. Podpora musí stav preveriť podľa metadát `paymentId`, `quoteId`, `orderId`, `customerId`, `attempt` v Stripe. Zaplatenú reláciu zosynchronizujte overeným webhookom. Nový pokus povoľte až po jednoznačnom overení, že predchádzajúca relácia nie je zaplatená a už nemôže byť zaplatená; neprepisujte platobné stavy naslepo. Funkcie na zmenu pokusu sú dostupné iba serverovému servisnému účtu.

Táto poistka vychádza z obmedzenej životnosti [Stripe idempotency keys](https://docs.stripe.com/api/idempotent_requests); pri neznámom výsledku nemožno spoliehať na neobmedzené opakovanie toho istého kľúča.

Refundácie vykonáva oprávnený administrátor v Stripe Dashboard. Webhook eviduje čiastočnú aj úplnú refundáciu; nemení dohodnutý rozsah prác ani automaticky neruší objednávku. Reklamácie, zrušenie po schválení ceny a prípadné platobné spory vyžadujú prevádzkový postup podpory.

**Dôležité:** rozdelenie 20 % / 80 % v databáze je výpočet, nie prevod peňazí. Stripe Connect, automatické výplaty majstrov, účtovné doklady a automatické riešenie sporov nie sú implementované. Pred prijímaním skutočných platieb musí prevádzkovateľ určiť a zabezpečiť výplaty, poplatky, fakturáciu a zodpovednosť za refundácie.

## 4. Nasadenie aplikácie

Repozitár je pripravený pre Next.js hosting, pôvodným cieľom je Vercel. Testovací deployment nesmie omylom používať produkčnú databázu alebo live Stripe kľúče.

```bash
npm ci
npm run verify
npm audit --omit=dev
npm run check:config -- --database
```

Pre ostrú konfiguráciu navyše spustite `npm run check:config -- --database --live`. Skript číta konfiguráciu a schému, nevypisuje tajné kľúče ani nevykonáva platbu. Nie je náhradou celkového integračného testu.

Nastavte podporovaný Node.js 22 alebo 24, premenné pre správne prostredie, doménu a HTTPS. Po deploymente znova overte Auth odkazy a webhook. Veľké fotografie sa posielajú priamo do Storage, nie cez veľký payload serverovej akcie.

## 5. Checklist pred verejným pilotom

- [ ] Záloha, skúšobná obnova a migrácia na testovacom projekte.
- [ ] Vyriešené staré platby a koordinované nasadenie bez súbežného starého Checkout.
- [ ] Štyri reálne testovacie účty: zákazník, majster, admin a cudzí používateľ.
- [ ] Registrácia, potvrdenie e-mailu a obnova hesla aj na inom zariadení.
- [ ] Päť fotografií, odmietnutie šiestej, veľkých súborov a cudzieho prístupu.
- [ ] Pridelenie overeného majstra; neoverený majster sa nedá prideliť.
- [ ] Ponuka nižšia aj vyššia než odhad, odmietnutie, nová verzia, schválenie a platba.
- [ ] Práce navyše nemožno dokončiť bez vyriešenia ponuky a platby.
- [ ] Chat, neprečítané správy, staršia história, obnovenie po výpadku spojenia.
- [ ] Podnet zákazníka nevidí majster a podnet majstra nevidí zákazník.
- [ ] Opakované/oneskorené webhooky, refundácia, prerušená platba a zrušenie objednávky.
- [ ] Mobil, klávesnica, čitateľnosť a slovenské texty vizuálne overené v prehliadači.
- [ ] Zabezpečené výplaty, fakturácia, provízia, refundácie a riešenie sporov.
- [ ] Doplnené skutočné údaje prevádzkovateľa, kontakty a potrebné prevádzkové/právne dokumenty; posúdené príslušným odborníkom. Kód ich nevymýšľa ani nenahrádza právne posúdenie.
- [ ] Reálni overení majstri, človek zodpovedný za podporu a dohodnuté reakčné časy.
- [ ] Sledovanie chýb a zlyhaných webhookov, zálohy, prístupy administrátorov a postup pri incidente.

Odporúčaný ďalší krok je uzavretý pilot s niekoľkými skúšobnými zákazkami. Žiadna položka vyššie sa nepovažuje za splnenú len na základe úspešného buildu.
