-- Previous migration failed because Postgres does not allow renaming function parameters
-- ("cannot change name of input parameter \"user_id\"").
-- Fix the function without renaming parameters by referencing the argument as $1.

CREATE OR REPLACE FUNCTION public.has_admin_role(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = $1
      AND ur.role = 'admin'::public.app_role
  );
$$;

-- Allow advanced/user roles to READ the same admin pages (read-only) by granting SELECT access
-- to the underlying tables used by SMS, Driver Requests, and Activity Logs.

-- driver_credentials (used by SMS driver list)
DROP POLICY IF EXISTS "Staff can view all driver credentials" ON public.driver_credentials;
CREATE POLICY "Staff can view all driver credentials"
ON public.driver_credentials
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advanced'::public.app_role)
  OR public.has_role(auth.uid(), 'user'::public.app_role)
);

-- driver_requests (admin requests page)
DROP POLICY IF EXISTS "Staff can view all requests" ON public.driver_requests;
CREATE POLICY "Staff can view all requests"
ON public.driver_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advanced'::public.app_role)
  OR public.has_role(auth.uid(), 'user'::public.app_role)
);

-- advanced should be able to act (update) like admin, but user remains read-only
DROP POLICY IF EXISTS "Admins and advanced can update requests" ON public.driver_requests;
CREATE POLICY "Admins and advanced can update requests"
ON public.driver_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advanced'::public.app_role)
);

-- driver_activity_logs (activity logs page)
DROP POLICY IF EXISTS "Staff can view all activity logs" ON public.driver_activity_logs;
CREATE POLICY "Staff can view all activity logs"
ON public.driver_activity_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advanced'::public.app_role)
  OR public.has_role(auth.uid(), 'user'::public.app_role)
);
