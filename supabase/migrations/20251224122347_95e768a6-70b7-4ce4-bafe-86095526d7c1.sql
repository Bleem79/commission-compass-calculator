-- Allow admins to update driver credentials (for status toggle)
CREATE POLICY "Admins can update driver credentials" 
ON public.driver_credentials 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));