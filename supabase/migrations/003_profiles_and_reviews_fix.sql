-- Migration: Add profiles table and fix reviews relationships
-- Creates profiles table and adds foreign key to reviews

-- 1. Create profiles table if not exists
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Enable RLS for profiles if not already enabled
alter table public.profiles enable row level security;

-- 3. Policy for viewing profiles (public) - drop if exists first
drop policy if exists "Anyone can view profiles" on public.profiles;
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

-- 4. Policy for users to update own profile - drop if exists first
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 5. Insert existing users into profiles (if they don't exist)
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- 6. Add foreign key constraint from reviews.user_id to profiles.id
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'reviews_user_id_fkey'
  ) then
    -- First update existing reviews to ensure user_id exists in profiles
    update public.reviews
    set user_id = user_id
    where exists (select 1 from public.profiles where id = reviews.user_id);
    
    alter table public.reviews 
    add constraint reviews_user_id_fkey 
    foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- 7. Drop existing review policies and recreate with profiles relationship
drop policy if exists "Anyone can read approved non-removed reviews" on public.reviews;
drop policy if exists "Signed-in users can insert own reviews" on public.reviews;
drop policy if exists "Users can update own reviews" on public.reviews;
drop policy if exists "Super admin can manage all reviews" on public.reviews;

-- 8. Policy for viewing approved non-removed reviews
create policy "Anyone can read approved non-removed reviews"
  on public.reviews for select
  using (is_approved = true and is_removed = false);

-- 9. Policy for signed-in users to insert reviews
create policy "Signed-in users can insert own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- 10. Policy for users to update own reviews
create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

-- 11. Policy for super admin to manage all reviews
create policy "Super admin can manage all reviews"
  on public.reviews for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );
