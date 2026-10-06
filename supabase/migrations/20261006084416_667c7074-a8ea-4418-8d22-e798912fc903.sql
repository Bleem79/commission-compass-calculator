CREATE OR REPLACE FUNCTION public.is_fleet_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      lower(email) = 'fleet@amantaxi.com'
      OR lower(raw_user_meta_data->>'username') = 'emad'
    )
  );
$$;