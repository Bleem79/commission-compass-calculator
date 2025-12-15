-- Allow drivers to view their own income data by matching driver_id through driver_credentials
CREATE POLICY "Drivers can view their own income data"
ON public.driver_income
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = driver_income.driver_id
  )
);