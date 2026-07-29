CREATE POLICY "Admins can delete survey submissions"
ON public.driver_surveys FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));