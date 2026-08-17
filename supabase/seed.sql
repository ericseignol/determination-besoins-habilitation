-- Premier organisme : ASFOR.
-- Adaptez le logo et la couleur à la charte graphique avant la mise en production.

insert into public.organizations (
  slug,
  name,
  reception_email,
  reception_email_verified_at,
  sender_name,
  logo_url,
  primary_color,
  website_url,
  is_active
)
values (
  'asfor',
  'ASFOR',
  'formation@asfor.net',
  now(),
  'ASFOR',
  null,
  '#0072bc',
  'https://www.asfor.net',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  reception_email = excluded.reception_email,
  reception_email_verified_at = excluded.reception_email_verified_at,
  sender_name = excluded.sender_name,
  logo_url = excluded.logo_url,
  primary_color = excluded.primary_color,
  website_url = excluded.website_url,
  is_active = excluded.is_active;
