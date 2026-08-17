-- Migration de la première version vers l’onboarding SaaS.
-- Réexécutable sans supprimer les données existantes.

alter table public.organizations
  add column if not exists reception_email_verified_at timestamptz;

alter table public.organizations
  add column if not exists sender_name text not null default 'Qualification Habilitations';

create table if not exists public.organization_email_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_email_verification_email_format
    check (position('@' in email) > 1),
  constraint organization_email_verification_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists organization_email_verifications_pending_idx
  on public.organization_email_verifications (organization_id, created_at desc)
  where verified_at is null;

alter table public.organization_email_verifications enable row level security;

revoke all on table public.organization_email_verifications from anon;
revoke all on table public.organization_email_verifications from authenticated;

-- Les réglages sensibles passent par l’API serveur afin qu’une adresse de réception
-- ne puisse pas être activée sans vérification.
revoke update on table public.organizations from authenticated;
grant select on table public.organizations to authenticated;

-- L’adresse ASFOR a déjà été contrôlée pendant la préparation initiale.
update public.organizations
set
  reception_email_verified_at = coalesce(reception_email_verified_at, now()),
  sender_name = 'ASFOR',
  is_active = true
where slug = 'asfor'
  and lower(reception_email) = 'formation@asfor.net';
