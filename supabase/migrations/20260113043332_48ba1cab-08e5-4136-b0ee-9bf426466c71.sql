-- Add shift column to target_trips table
ALTER TABLE public.target_trips ADD COLUMN IF NOT EXISTS shift text;