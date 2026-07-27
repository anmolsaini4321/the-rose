-- ============================================================
-- The Rose by Geetanjli — Online Store Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. user_roles ──────────────────────────────────────────
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('super_admin', 'admin', 'user')),
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Super admin full access to roles"
  on public.user_roles for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 2. products ────────────────────────────────────────────
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slug                text not null unique,
  description         text not null default '',
  short_description   text,
  price               numeric(10,2) not null check (price >= 0),
  original_price      numeric(10,2),
  flowers_included    text[] not null default '{}',
  category            text not null default 'bouquet',
  tags                text[] not null default '{}',
  images              text[] not null default '{}',
  thumbnail           text,
  is_published        boolean not null default false,
  is_featured         boolean not null default false,
  stock_count         integer not null default 0,
  created_by          uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  meta_title          text,
  meta_description    text,
  average_rating      numeric(3,2) not null default 0,
  review_count        integer not null default 0
);

alter table public.products enable row level security;

create policy "Anyone can view published products"
  on public.products for select
  using (is_published = true);

create policy "Super admin can manage all products"
  on public.products for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 2b. carts (user cart) ──────────────────────────────────
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.carts enable row level security;

create policy "Users can read own cart"
  on public.carts for select
  using (auth.uid() = user_id);

create policy "Users can insert/update own cart"
  on public.carts for all
  using (auth.uid() = user_id);

-- ── 3. reviews ─────────────────────────────────────────────
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rating          smallint not null check (rating >= 1 and rating <= 5),
  title           text,
  body            text not null default '',
  is_approved     boolean not null default true,
  is_removed      boolean not null default false,
  removed_by      uuid references auth.users(id),
  removed_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, user_id)
);

alter table public.reviews enable row level security;

create policy "Anyone can read approved non-removed reviews"
  on public.reviews for select
  using (is_approved = true and is_removed = false);

create policy "Signed-in users can insert own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "Super admin can manage all reviews"
  on public.reviews for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 4. orders ──────────────────────────────────────────────
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id),
  status                text not null default 'pending'
                          check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  total_amount          numeric(10,2) not null check (total_amount >= 0),
  razorpay_order_id     text,
  razorpay_payment_id   text,
  razorpay_signature    text,
  shipping_name         text not null,
  shipping_phone        text not null,
  shipping_address      text not null,
  shipping_city         text not null,
  shipping_pincode      text not null,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pending orders"
  on public.orders for update
  using (auth.uid() = user_id and status in ('pending'));

create policy "Super admin can manage all orders"
  on public.orders for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 5. order_items ─────────────────────────────────────────
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id),
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null check (unit_price >= 0),
  created_at  timestamptz not null default now()
);

alter table public.order_items enable row level security;

create policy "Users can read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "Users can insert order items for own orders"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "Super admin can manage all order items"
  on public.order_items for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 6. Storage bucket for product images ───────────────────
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

create policy "Anyone can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Super admin can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images' and
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

create policy "Super admin can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images' and
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 7. Helper function: update product rating ──────────────
create or replace function public.update_product_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.products
  set
    average_rating = (
      select coalesce(avg(rating), 0)
      from public.reviews
      where product_id = coalesce(new.product_id, old.product_id)
        and is_approved = true and is_removed = false
    ),
    review_count = (
      select count(*)
      from public.reviews
      where product_id = coalesce(new.product_id, old.product_id)
        and is_approved = true and is_removed = false
    ),
    updated_at = now()
  where id = coalesce(new.product_id, old.product_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_update_product_rating
  after insert or update or delete on public.reviews
  for each row execute function public.update_product_rating();

-- ── 8. profiles — ensure created on signup ─────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 9. Make super_admin visible to itself in products ──────
-- Super admin also needs to see unpublished products
create policy "Super admin can view all products incl unpublished"
  on public.products for select
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ── 10. Super admin can see all reviews (incl removed) ─────
create policy "Super admin can view all reviews"
  on public.reviews for select
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'super_admin'
    )
  );

-- ============================================================
-- SUPER ADMIN SEED
-- After running this, manually INSERT the super admin user:
--
-- Step 1: Sign up with email: superadmin@therose.com / password of choice
-- Step 2: Get the UUID from auth.users
-- Step 3: Run:
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<your-uuid>', 'super_admin');
-- ============================================================
