-- Add DELETE policy for admins on driver_credentials table
CREATE POLICY "Admins can delete driver credentials"
ON public.driver_credentials
FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM user_roles
  WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
));