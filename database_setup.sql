-- ==========================================
--  INNOVA CLEAN - INVENTORY APP DB SETUP
--  All-in-One Setup Script (vFinal)
-- ==========================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- USERS
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  password text not null, 
  name text not null,
  role text not null check (role in ('admin', 'seller')),
  email text,
  phone text,
  start_date timestamp with time zone default now(),
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- CLIENTS
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  rfc text,
  address text,
  zip_code text,
  colonia text,
  city text,
  state text,
  email text,
  phone text,
  wallet_balance numeric default 0,
  wallet_status text default 'active', -- active, inactive
  created_at timestamp with time zone default now()
);

-- PRODUCTS
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  sku text unique not null,
  category text,
  name text not null,
  unit text default 'Pieza',
  price_retail numeric default 0,
  price_medium numeric default 0,
  price_wholesale numeric default 0,
  cost numeric default 0,
  stock_initial numeric default 0,
  stock_current numeric default 0,
  created_at timestamp with time zone default now()
);

-- SALES
create table if not exists public.sales (
  id uuid default uuid_generate_v4() primary key,
  folio text not null,
  date timestamp with time zone default now(),
  sku text references public.products(sku),
  product_name text,
  quantity numeric not null,
  price numeric not null,
  total numeric not null,
  price_type text,
  seller_id uuid references public.users(id),
  seller_name text,
  client_id uuid references public.clients(id),
  client_name text,
  payment_method text default 'cash',
  payment_details jsonb,
  is_correction boolean default false,
  is_cancelled boolean default false,
  correction_note text,
  created_at timestamp with time zone default now()
);

-- PURCHASES
-- Note: user_id is NOT a foreign key to allow flexible history even if users are deleted/changed
create table if not exists public.purchases (
  id uuid default uuid_generate_v4() primary key,
  sku text references public.products(sku),
  product_name text,
  quantity numeric not null,
  cost numeric not null,
  -- We do NOT use generated columns to avoid insert issues from App
  total numeric, 
  supplier text,
  date timestamp with time zone default now(),
  notes text,
  user_id uuid, -- No FK constraint
  user_name text,
  created_at timestamp with time zone default now()
);

-- EXPENSES
create table if not exists public.expenses (
  id uuid default uuid_generate_v4() primary key,
  description text not null,
  amount numeric not null,
  type text check (type in ('fijo', 'variable')),
  category text,
  date date default CURRENT_DATE,
  user_id uuid references public.users(id) on delete set null,
  user_name text,
  created_at timestamp with time zone default now()
);

-- LOYALTY TRANSACTIONS
create table if not exists public.loyalty_transactions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id),
  sale_id uuid, -- Optional link to sale
  amount numeric not null, -- Money value
  points numeric default 0,
  type text check (type in ('earn', 'redeem', 'adjustment')),
  description text,
  created_at timestamp with time zone default now()
);

-- SETTINGS
create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  company_name text default 'Innova Clean',
  theme_id text default 'blue',
  logo_url text,
  price_threshold_medium numeric default 6,
  price_threshold_wholesale numeric default 12,
  loyalty_percentage numeric default 1,
  address text,
  rfc text,
  phone text,
  email text,
  city text,
  state text,
  zip_code text,
  colonia text,
  master_pin text
);

-- 3. ENABLE RLS (SECURITY)
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.clients enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.settings enable row level security;

-- 4. POLICIES (Access for App)
-- We grant full access to anonymous/authenticated users because the App handles Auth security.
-- This prevents "new row violates row-level security policy" errors.

create policy "App Access Users" on public.users for all to public using (true) with check (true);
create policy "App Access Products" on public.products for all to public using (true) with check (true);
create policy "App Access Sales" on public.sales for all to public using (true) with check (true);
create policy "App Access Clients" on public.clients for all to public using (true) with check (true);
create policy "App Access Purchases" on public.purchases for all to public using (true) with check (true);
create policy "App Access Expenses" on public.expenses for all to public using (true) with check (true);
create policy "App Access Loyalty" on public.loyalty_transactions for all to public using (true) with check (true);
create policy "App Access Settings" on public.settings for all to public using (true) with check (true);

-- Grant permissions explicitly
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- 5. INITIAL DATA

-- Default Admin
-- Username: admin, Password: admin
insert into public.users (username, password, name, role, email, phone)
values ('admin', 'admin', 'Administrador Principal', 'admin', 'admin@sistema.com', '555-0000')
on conflict (username) do nothing;

-- Default Public Client
insert into public.clients (name, rfc, address)
values ('PÚBLICO GENERAL', 'XAXX010101000', '-')
on conflict do nothing;

-- Default Settings
insert into public.settings (company_name, theme_id)
values ('Innova Clean', 'blue');
