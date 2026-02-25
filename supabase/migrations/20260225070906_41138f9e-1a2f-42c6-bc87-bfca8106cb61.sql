
-- Drop the existing controller-only update policy
DROP POLICY IF EXISTS "Controllers can update assigned driver credentials" ON public.driver_credentials;

-- Create new policy allowing all staff (admin, advanced, user) to update any driver credentials
CREATE POLICY "Staff can update driver credentials"
ON public.driver_credentials
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advanced'::app_role)
  OR has_role(auth.uid(), 'user'::app_role)
);
