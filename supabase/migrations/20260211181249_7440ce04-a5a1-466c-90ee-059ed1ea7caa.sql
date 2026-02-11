
-- Allow staff (admin, advanced, user roles) to view all driver income data
CREATE POLICY "Staff can view all driver income data"
ON public.driver_income
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'advanced'::app_role) 
  OR has_role(auth.uid(), 'user'::app_role)
);

-- Allow staff to view all target trips data
CREATE POLICY "Staff can view all target trips"
ON public.target_trips
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'advanced'::app_role) 
  OR has_role(auth.uid(), 'user'::app_role)
);
