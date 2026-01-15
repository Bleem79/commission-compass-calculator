-- Change target_trips column from integer to numeric to support decimal values
ALTER TABLE public.target_trips 
ALTER COLUMN target_trips TYPE numeric USING target_trips::numeric;