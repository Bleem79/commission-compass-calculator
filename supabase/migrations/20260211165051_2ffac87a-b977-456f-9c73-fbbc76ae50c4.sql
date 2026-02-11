
-- Create a secure function to get the current user's username from raw_user_meta_data
-- Using SECURITY DEFINER so it bypasses RLS and reads from auth.users directly
CREATE OR REPLACE FUNCTION public.get_my_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (raw_user_meta_data->>'username')::text
  FROM auth.users
  WHERE id = auth.uid()
$$;

-- Recreate policies using the secure function instead of jwt metadata
DROP POLICY IF EXISTS "Controllers can view assigned driver requests" ON public.driver_requests;

CREATE POLICY "Controllers can view assigned driver requests"
ON public.driver_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_master_file dmf
    WHERE dmf.driver_id = driver_requests.driver_id
    AND lower(dmf.controller) = lower(public.get_my_username())
  )
);

DROP POLICY IF EXISTS "Admins and advanced can update requests" ON public.driver_requests;

CREATE POLICY "Admins and advanced can update requests"
ON public.driver_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'advanced'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.driver_master_file dmf
      WHERE dmf.driver_id = driver_requests.driver_id
      AND lower(dmf.controller) = lower(public.get_my_username())
    )
  )
);
