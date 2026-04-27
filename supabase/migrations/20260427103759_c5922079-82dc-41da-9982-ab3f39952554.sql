-- Allow drivers to view their own badge records
CREATE POLICY "Drivers can view their own badges"
ON public.driver_badges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_credentials dc
    WHERE dc.user_id = auth.uid()
      AND dc.driver_id = driver_badges.driver_id
      AND dc.status = 'enabled'
  )
);

-- Allow staff (admin/advanced/user) to view all driver badges
CREATE POLICY "Staff can view all driver badges"
ON public.driver_badges
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advanced'::app_role)
  OR has_role(auth.uid(), 'user'::app_role)
);

-- Allow any authenticated user to view the badge catalog (needed to resolve badge image)
CREATE POLICY "Authenticated users can view badge catalog"
ON public.driver_badge_catalog
FOR SELECT
USING (auth.uid() IS NOT NULL);