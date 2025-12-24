-- Add total_trips and shift columns to driver_income table
ALTER TABLE public.driver_income 
ADD COLUMN IF NOT EXISTS total_trips integer,
ADD COLUMN IF NOT EXISTS shift text;