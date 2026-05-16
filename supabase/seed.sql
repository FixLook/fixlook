insert into public.services (name, description, base_price, active)
values
  ('Electrician', 'Electrical diagnostics, repairs, sockets, switches, and small installations.', 6000, true),
  ('Plumber', 'Leaks, clogged drains, sink, toilet, and pipe repairs.', 5500, true)
on conflict (name) do update set
  description = excluded.description,
  base_price = excluded.base_price,
  active = excluded.active;
