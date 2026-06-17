-- ============================================================================
--  EXPENSE MACHINE — SUPABASE SCHEMA  (Phase 13)
-- ============================================================================
--
--  User-scoped cloud persistence for every local data domain:
--    transactions, budgets, settings, clients, invoices, notifications.
--
--  Design notes:
--   * Every row is owned by auth.uid() and protected by Row Level Security, so
--     the public anon key is safe in the browser — a user can only ever read or
--     write their own rows.
--   * Domains that are naturally a single blob per user (budgets caps, settings)
--     are stored as one JSONB row keyed by user_id for simple last-write-wins
--     sync. List domains (transactions, clients, invoices, notifications) get a
--     row per entity with an updated_at for conflict resolution.
--   * `updated_at` is maintained by a trigger to support offline-first merge
--     (latest write wins per row).
--
--  Apply with: supabase db push   (or paste into the Supabase SQL editor)
-- ----------------------------------------------------------------------------

-- updated_at trigger ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- transactions ---------------------------------------------------------------
create table if not exists public.transactions (
  id            text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  merchant      text not null,
  description   text,
  amount        numeric(14,2) not null,
  category      text not null,
  account_id    text,
  payment_method text,
  notes         text,
  confidence    real,
  edited        boolean default false,
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- budgets (one JSONB blob of caps per user) ----------------------------------
create table if not exists public.budgets (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  caps        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- settings (one JSONB blob per user) -----------------------------------------
create table if not exists public.settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- clients --------------------------------------------------------------------
create table if not exists public.clients (
  id           text not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  company      text,
  email        text,
  matchers     jsonb not null default '[]'::jsonb,
  default_rate numeric(14,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

-- invoices -------------------------------------------------------------------
create table if not exists public.invoices (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   text not null,
  number      text not null,
  issued_on   date not null,
  due_on      date not null,
  status      text not null default 'draft',
  lines       jsonb not null default '[]'::jsonb,
  notes       text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists invoices_user_client_idx
  on public.invoices (user_id, client_id);

-- notifications --------------------------------------------------------------
create table if not exists public.notifications (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  tone        text not null,
  title       text not null,
  body        text,
  at          timestamptz not null default now(),
  read        boolean not null default false,
  dismissed   boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- updated_at triggers --------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','settings','clients','invoices','notifications']
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- Row Level Security ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','settings','clients','invoices','notifications']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'drop policy if exists "owner_all" on public.%I; '
      'create policy "owner_all" on public.%I '
      'for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
  end loop;
end $$;
