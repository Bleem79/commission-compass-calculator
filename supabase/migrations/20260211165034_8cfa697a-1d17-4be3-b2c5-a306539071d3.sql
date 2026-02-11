
-- Drop the overly permissive staff policy
DROP POLICY IF EXISTS "Staff can view all requests" ON public.driver_requests;

-- Controllers can only view requests from drivers assigned to them
CREATE POLICY "Controllers can view assigned driver requests"
ON public.driver_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_master_file dmf
    WHERE dmf.driver_id = driver_requests.driver_id
    AND lower(dmf.controller) = lower((auth.jwt()->'user_metadata'->>'username')::text)
  )
);

-- Also scope the update policy for advanced users to only their assigned drivers
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
      AND lower(dmf.controller) = lower((auth.jwt()->'user_metadata'->>'username')::text)
    )
  )
);
