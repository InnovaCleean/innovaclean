-- Add unit column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Pieza';
