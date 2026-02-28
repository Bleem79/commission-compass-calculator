
-- Add plaintext password column to driver_credentials
ALTER TABLE public.driver_credentials
ADD COLUMN password_text text;
