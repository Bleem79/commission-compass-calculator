CREATE POLICY "Admins and staff can view all payment collections"
ON public.payment_collections
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'advanced'::app_role)
  OR public.has_role(auth.uid(), 'user'::app_role)
);