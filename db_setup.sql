-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- create users table (separate from auth.users for this simple app)
create table public.users (
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

-- Initial Admin and Seller
insert into public.users (username, password, name, role, email, phone)
values 
('admin', 'admin', 'Administrador', 'admin', 'admin@tu-empresa.com', '555-0000'),
('vendedor1', '123', 'Juan Alejandro', 'seller', 'juan@gmail.com', '555-1234');

-- Products Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  sku text unique not null,
  category text,
  name text not null,
  price_retail numeric default 0,
  price_medium numeric default 0,
  price_wholesale numeric default 0,
  cost numeric default 0,
  stock_initial numeric default 0,
  stock_current numeric default 0,
  created_at timestamp with time zone default now()
);

-- Clients Table
create table public.clients (
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
  created_at timestamp with time zone default now()
);

-- Initial Client
insert into public.clients (name, rfc, address, zip_code, colonia, city, state)
values ('PÚBLICO GENERAL', 'XAXX010101000', '-', '-', '-', '-', '-');

-- Sales Table
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  folio text not null,
  date timestamp with time zone default now(),
  sku text references public.products(sku),
  product_name text,
  quantity numeric not null,
  price numeric not null,
  total numeric not null,
  price_type text, -- 'retail', 'medium', 'wholesale'
  seller_id uuid references public.users(id),
  seller_name text,
  client_id uuid references public.clients(id),
  client_name text,
  is_correction boolean default false,
  correction_note text,
  created_at timestamp with time zone default now()
);

-- Purchases Table (Restocking)
create table public.purchases (
  id uuid default uuid_generate_v4() primary key,
  sku text references public.products(sku),
  product_name text,
  quantity numeric not null,
  cost numeric not null,
  total numeric generated always as (quantity * cost) stored,
  supplier text,
  date timestamp with time zone default now(),
  notes text,
  created_at timestamp with time zone default now()
);

-- Settings Table (Global Config)
create table public.settings (
  id uuid default uuid_generate_v4() primary key,
  company_name text default 'Innova Clean',
  theme_id text default 'blue',
  logo_url text,
  price_threshold_medium numeric default 6,
  price_threshold_wholesale numeric default 12
);

insert into public.settings (company_name) values ('Innova Clean');

-- Enable RLS
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.clients enable row level security;
alter table public.purchases enable row level security;
alter table public.settings enable row level security;

-- Policies
create policy "Allow all access" on public.users for all using (true) with check (true);
create policy "Allow all access" on public.products for all using (true) with check (true);
create policy "Allow all access" on public.sales for all using (true) with check (true);
create policy "Allow all access" on public.clients for all using (true) with check (true);
create policy "Allow all access" on public.purchases for all using (true) with check (true);
create policy "Allow all access" on public.settings for all using (true) with check (true);

-- Add unit column to products table

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Litro';
