-- Rasoi Assistant — database schema
-- Run once in Supabase → SQL Editor.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null default '',
  language      text not null default 'en',
  units         text not null default 'metric',      -- metric | imperial | indian
  cuisines      text[] not null default '{}',
  diet          text not null default 'non-vegetarian',
  health_flags  text[] not null default '{}',
  allergies     text[] not null default '{}',
  voice_enabled boolean not null default false,
  voice_language text not null default 'en-US',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- recipes ----------
create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  servings    int  not null default 2,
  cuisine     text not null default '',
  ingredients jsonb not null default '[]',
  steps       jsonb not null default '[]',
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes (user_id, created_at desc);

-- ---------- meal_plans ----------
create table if not exists public.meal_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  meal_type  text not null,                          -- breakfast | lunch | dinner | snack
  recipe_id  uuid references public.recipes (id) on delete set null,
  title      text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date, meal_type)
);
create index if not exists meal_plans_user_date_idx on public.meal_plans (user_id, date);

-- ---------- row level security ----------
alter table public.profiles   enable row level security;
alter table public.recipes    enable row level security;
alter table public.meal_plans enable row level security;

-- Each user can only touch their own rows.
create policy "own profile"    on public.profiles
  for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own recipes"    on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meal_plans" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- auto-create a profile row on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
