
-- Create a function to check if the current user is fleet@amantaxi.com
CREATE OR REPLACE FUNCTION public.is_fleet_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND lower(email) = 'fleet@amantaxi.com'
  );
$$;

-- Allow fleet@amantaxi.com to view all driver requests
CREATE POLICY "Fleet user can view all requests"
ON public.driver_requests
FOR SELECT
USING (public.is_fleet_user());
