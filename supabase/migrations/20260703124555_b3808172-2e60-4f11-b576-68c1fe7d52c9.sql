-- SELECT: advanced controllers should NOT see all requests, only their assigned ones (via existing "Controllers can view assigned driver requests" policy). Keep view-only 'user' role able to see all.
DROP POLICY IF EXISTS "Advanced can view all requests" ON public.driver_requests;
CREATE POLICY "Staff users can view all requests"
ON public.driver_requests
FOR SELECT
USING (has_role(auth.uid(), 'user'::app_role));

-- UPDATE: remove blanket update for advanced. Advanced controllers keep scoped update via "Admins and advanced can update requests".
DROP POLICY IF EXISTS "Advanced can update all requests" ON public.driver_requests;