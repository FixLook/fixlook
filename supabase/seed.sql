-- Príklady orientačných cien. Pred spustením ich upravte podľa skutočných nákladov.
insert into public.services (name, description, base_price, estimate_max, active)
values
  ('Elektrikár', 'Elektroinštalácie, zásuvky, osvetlenie a drobné opravy.', 6000, 15000, true),
  ('Inštalatér', 'Úniky vody, batérie, odpady a drobné inštalatérske práce.', 5500, 14000, true)
on conflict (name) do nothing;
