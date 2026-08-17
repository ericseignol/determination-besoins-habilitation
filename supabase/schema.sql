-- Schéma initial du SaaS de qualification en habilitation électrique.
-- À exécuter dans le SQL Editor d’un projet Supabase neuf.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  reception_email text not null,
  reception_email_verified_at timestamptz,
  sender_name text not null default 'Qualification Habilitations',
  logo_url text,
  primary_color text not null default '#096b72',
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint organizations_primary_color_format
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint organizations_reception_email_format
    check (position('@' in reception_email) > 1)
);

-- Ces ajouts rendent le script réexécutable sur la première version déjà déployée.
alter table public.organizations
  add column if not exists reception_email_verified_at timestamptz;
alter table public.organizations
  add column if not exists sender_name text not null default 'Qualification Habilitations';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_allowed check (role in ('admin', 'member'))
);

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

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_name text not null,
  company_name text not null,
  email text not null,
  phone text not null,
  employee_names text[] not null default '{}',
  recommended_habilitations text[] not null default '{}',
  status text not null default 'new',
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospects_status_allowed
    check (status in ('new', 'contacted', 'qualified', 'won', 'lost', 'archived')),
  constraint prospects_id_organization_unique unique (id, organization_id)
);

create table if not exists public.questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null,
  answers jsonb not null default '[]'::jsonb,
  affirmations text[] not null default '{}',
  recommendations text[] not null default '{}',
  ip_hash text not null,
  duration_seconds integer not null default 0,
  request_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint questionnaire_answers_array check (jsonb_typeof(answers) = 'array'),
  constraint questionnaire_ip_hash_format check (ip_hash ~ '^[0-9a-f]{64}$'),
  constraint questionnaire_duration_positive check (duration_seconds >= 0),
  constraint questionnaire_prospect_same_organization
    foreign key (prospect_id, organization_id)
    references public.prospects (id, organization_id)
    on delete cascade,
  constraint questionnaire_id_organization_prospect_unique
    unique (id, organization_id, prospect_id)
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null,
  submission_id uuid not null,
  provider text not null default 'brevo',
  recipient_email text not null,
  status text not null default 'pending',
  attempt_number integer not null default 1,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_logs_status_allowed check (status in ('pending', 'sent', 'failed')),
  constraint email_logs_attempt_positive check (attempt_number > 0),
  constraint email_logs_attempt_unique unique (submission_id, attempt_number),
  constraint email_logs_submission_same_organization
    foreign key (submission_id, organization_id, prospect_id)
    references public.questionnaire_submissions (id, organization_id, prospect_id)
    on delete cascade
);

create index if not exists profiles_organization_idx
  on public.profiles (organization_id);
create index if not exists organization_email_verifications_pending_idx
  on public.organization_email_verifications (organization_id, created_at desc)
  where verified_at is null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'organization-assets',
  'organization-assets',
  true,
  1500000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create index if not exists prospects_organization_created_idx
  on public.prospects (organization_id, created_at desc);
create index if not exists submissions_organization_created_idx
  on public.questionnaire_submissions (organization_id, created_at desc);
create index if not exists submissions_rate_limit_idx
  on public.questionnaire_submissions (organization_id, ip_hash, created_at desc);
create index if not exists email_logs_organization_created_idx
  on public.email_logs (organization_id, created_at desc);
create index if not exists email_logs_submission_idx
  on public.email_logs (submission_id, attempt_number desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists prospects_set_updated_at on public.prospects;
create trigger prospects_set_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

-- Ces fonctions évitent la récursion RLS lors de la résolution de l’organisme courant.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.current_organization_id() from public;
revoke all on function public.current_user_is_org_admin() from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_user_is_org_admin() to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_email_verifications enable row level security;
alter table public.prospects enable row level security;
alter table public.questionnaire_submissions enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "organization members can read organization" on public.organizations;
create policy "organization members can read organization"
on public.organizations
for select
to authenticated
using (id = public.current_organization_id());

drop policy if exists "organization admins can update organization" on public.organizations;
create policy "organization admins can update organization"
on public.organizations
for update
to authenticated
using (
  id = public.current_organization_id()
  and public.current_user_is_org_admin()
)
with check (
  id = public.current_organization_id()
  and public.current_user_is_org_admin()
);

drop policy if exists "members can read profiles in own organization" on public.profiles;
create policy "members can read profiles in own organization"
on public.profiles
for select
to authenticated
using (organization_id = public.current_organization_id());

drop policy if exists "members can read own organization prospects" on public.prospects;
create policy "members can read own organization prospects"
on public.prospects
for select
to authenticated
using (organization_id = public.current_organization_id());

drop policy if exists "members can update own organization prospects" on public.prospects;
create policy "members can update own organization prospects"
on public.prospects
for update
to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists "admins can delete own organization prospects" on public.prospects;
create policy "admins can delete own organization prospects"
on public.prospects
for delete
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.current_user_is_org_admin()
);

drop policy if exists "members can read own organization submissions"
  on public.questionnaire_submissions;
create policy "members can read own organization submissions"
on public.questionnaire_submissions
for select
to authenticated
using (organization_id = public.current_organization_id());

drop policy if exists "members can read own organization email logs" on public.email_logs;
create policy "members can read own organization email logs"
on public.email_logs
for select
to authenticated
using (organization_id = public.current_organization_id());

-- Le navigateur public n’accède jamais directement aux tables.
revoke all on table public.organizations from anon;
revoke all on table public.profiles from anon;
revoke all on table public.organization_email_verifications from anon;
revoke all on table public.organization_email_verifications from authenticated;
revoke all on table public.prospects from anon;
revoke all on table public.questionnaire_submissions from anon;
revoke all on table public.email_logs from anon;

revoke update on table public.organizations from authenticated;
grant select on table public.organizations to authenticated;
grant select on table public.profiles to authenticated;
grant select, update, delete on table public.prospects to authenticated;
grant select on table public.questionnaire_submissions to authenticated;
grant select on table public.email_logs to authenticated;
