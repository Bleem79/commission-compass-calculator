-- Add status column to driver_credentials table
ALTER TABLE public.driver_credentials 
ADD COLUMN status text NOT NULL DEFAULT 'enabled' 
CHECK (status IN ('enabled', 'disabled'));

-- Update the RLS policy for drivers viewing their own income data to check status
DROP POLICY IF EXISTS "Drivers can view their own income data" ON public.driver_income;

CREATE POLICY "Drivers can view their own income data" 
ON public.driver_income 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid() 
    AND dc.driver_id = driver_income.driver_id
    AND dc.status = 'enabled'
  )
);

-- Update the RLS policy for drivers viewing their own credentials to check status
DROP POLICY IF EXISTS "Drivers can view their own credentials" ON public.driver_credentials;

CREATE POLICY "Drivers can view their own credentials" 
ON public.driver_credentials 
FOR SELECT 
USING (user_id = auth.uid() AND status = 'enabled');