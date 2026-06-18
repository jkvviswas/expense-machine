-- ============================================================================
--  EXPENSE MACHINE — REVIEWS TABLE
-- ============================================================================
--  Run this in your Supabase project:  SQL Editor → New query → paste → Run.
--
--  This creates a public reviews table. Anyone signed in can submit a review;
--  only reviews you mark approved = true are shown publicly on the landing page.
--  You moderate by flipping `approved` in Table Editor → reviews.
-- ============================================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  name        text not null,
  role        text default '',
  rating      int  not null check (rating between 1 and 5),
  comment     text not null,
  approved    boolean not null default false,   -- you flip this to show it publicly
  created_at  timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Anyone (even logged-out visitors) may READ reviews that you have approved.
drop policy if exists "reviews_read_approved" on public.reviews;
create policy "reviews_read_approved"
  on public.reviews for select
  using (approved = true);

-- Any signed-in user may SUBMIT a review (it starts unapproved).
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

-- A user may read their own (even unapproved) review back.
drop policy if exists "reviews_read_own" on public.reviews;
create policy "reviews_read_own"
  on public.reviews for select
  to authenticated
  using (auth.uid() = user_id);
