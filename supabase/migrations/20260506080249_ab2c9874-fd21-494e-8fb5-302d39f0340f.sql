CREATE POLICY "Advanced can view all requests"
ON public.driver_requests FOR SELECT
USING (has_role(auth.uid(), 'advanced'::app_role) OR has_role(auth.uid(), 'user'::app_role));

CREATE POLICY "Advanced can update all requests"
ON public.driver_requests FOR UPDATE
USING (has_role(auth.uid(), 'advanced'::app_role) OR has_role(auth.uid(), 'user'::app_role));