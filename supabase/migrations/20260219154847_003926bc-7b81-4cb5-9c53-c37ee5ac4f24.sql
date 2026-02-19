
-- Allow advanced users to update driver_credentials for drivers assigned to them
CREATE POLICY "Controllers can update assigned driver credentials"
ON public.driver_credentials
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.driver_master_file dmf
    WHERE dmf.driver_id = driver_credentials.driver_id
      AND lower(dmf.controller) = lower(public.get_my_username())
  )
  AND (
    public.has_role(auth.uid(), 'advanced'::app_role)
    OR public.has_role(auth.uid(), 'user'::app_role)
  )
);
