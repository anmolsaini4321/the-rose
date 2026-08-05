-- Migration: Add delivery_confirmed_by_user column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed_by_user BOOLEAN DEFAULT FALSE;
