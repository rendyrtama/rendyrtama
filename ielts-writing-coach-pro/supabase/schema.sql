-- Writing Coach for IELTS: database schema.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- The browser can only READ its own rows. Every change (credits, tests, orders) goes through the
-- server functions in /api, which use the service-role key and the functions below.

-- Accounts --------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  free_tests  integer not null default 2 check (free_tests >= 0),
  credits     integer not null default 0 check (credits >= 0),   -- 1 credit = 1 marked task
  created_at  timestamptz not null default now()
);

-- Give every new sign-in a profile with 2 free tests.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tests -----------------------------------------------------------------------
create table if not exists public.tests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  module         text not null check (module in ('academic','general')),
  mode           text not null check (mode in ('t1','t2','both')),
  tasks          jsonb not null,                    -- [{task, qid} | {task, custom:{prompt, desc, hasImage, guessType}}]
  paid_with      text not null check (paid_with in ('free','credits')),
  credits_used   integer not null default 0,
  attempts       integer[] not null default '{0,0}',  -- marking attempts per task (max 3, allows retries after errors)
  model_answers  integer[] not null default '{0,0}',  -- model answers per task (max 1)
  results        jsonb not null default '[null,null]'::jsonb,
  answers        jsonb not null default '[null,null]'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists tests_user_idx on public.tests (user_id, created_at desc);

-- Orders ----------------------------------------------------------------------
create table if not exists public.orders (
  id            text primary key,                     -- our order number, e.g. WC-LZ3K9-AB12C
  user_id       uuid not null references public.profiles(id) on delete cascade,
  package       text not null,
  credits       integer not null check (credits > 0),
  provider      text not null check (provider in ('midtrans','paypal')),
  amount        numeric(12,2) not null,
  currency      text not null check (currency in ('IDR','USD')),
  status        text not null default 'pending' check (status in ('pending','paid','expired','failed')),
  provider_ref  text,                                 -- Midtrans transaction id / PayPal order id
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- Row-level security: users may read only their own rows; nobody writes from the browser.
alter table public.profiles enable row level security;
alter table public.tests    enable row level security;
alter table public.orders   enable row level security;
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "read own tests"   on public.tests;
drop policy if exists "read own orders"  on public.orders;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "read own tests"   on public.tests    for select using (auth.uid() = user_id);
create policy "read own orders"  on public.orders   for select using (auth.uid() = user_id);

-- Atomic operations (called by the server with the service-role key) ---------------------------

-- Start a test: use a free test if any are left, otherwise take p_cost credits.
-- Returns 'free', 'credits', or NULL when the user can't pay.
create or replace function public.start_test(p_user uuid, p_cost integer) returns text
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (p_user) on conflict (id) do nothing;
  update public.profiles set free_tests = free_tests - 1 where id = p_user and free_tests > 0;
  if found then return 'free'; end if;
  update public.profiles set credits = credits - p_cost where id = p_user and credits >= p_cost;
  if found then return 'credits'; end if;
  return null;
end $$;

-- Count one marking attempt for task p_idx (0-based) if the test belongs to the user,
-- the task is not marked yet and fewer than 3 attempts were used. Returns the task spec or NULL.
create or replace function public.begin_grade(p_test uuid, p_user uuid, p_idx integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare spec jsonb;
begin
  update public.tests
     set attempts[p_idx + 1] = attempts[p_idx + 1] + 1
   where id = p_test and user_id = p_user
     and p_idx >= 0 and p_idx < jsonb_array_length(tasks)
     and attempts[p_idx + 1] < 3
     and (results -> p_idx) = 'null'::jsonb
  returning tasks -> p_idx into spec;
  return spec;
end $$;

-- Allow one model answer per task. Returns the task spec or NULL.
create or replace function public.begin_model_answer(p_test uuid, p_user uuid, p_idx integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare spec jsonb;
begin
  update public.tests
     set model_answers[p_idx + 1] = model_answers[p_idx + 1] + 1
   where id = p_test and user_id = p_user
     and p_idx >= 0 and p_idx < jsonb_array_length(tasks)
     and model_answers[p_idx + 1] < 1
     and (results -> p_idx) <> 'null'::jsonb
  returning tasks -> p_idx into spec;
  return spec;
end $$;

-- Save a marking result for task p_idx.
create or replace function public.save_result(p_test uuid, p_idx integer, p_result jsonb, p_answer text) returns void
language sql security definer set search_path = public as $$
  update public.tests
     set results = jsonb_set(results, array[p_idx::text], p_result),
         answers = jsonb_set(answers, array[p_idx::text], to_jsonb(p_answer))
   where id = p_test;
$$;

-- Mark an order paid and add its credits exactly once (safe to call repeatedly).
create or replace function public.mark_order_paid(p_order text, p_ref text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  update public.orders set status = 'paid', paid_at = now(), provider_ref = coalesce(p_ref, provider_ref)
   where id = p_order and status in ('pending','expired','failed')
  returning user_id, credits into o;
  if not found then return false; end if;
  update public.profiles set credits = credits + o.credits where id = o.user_id;
  return true;
end $$;

-- Only the server (service role) may call these functions.
revoke all on function public.start_test(uuid, integer)                  from public, anon, authenticated;
revoke all on function public.begin_grade(uuid, uuid, integer)           from public, anon, authenticated;
revoke all on function public.begin_model_answer(uuid, uuid, integer)    from public, anon, authenticated;
revoke all on function public.save_result(uuid, integer, jsonb, text)    from public, anon, authenticated;
revoke all on function public.mark_order_paid(text, text)                from public, anon, authenticated;
