CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

ALTER FUNCTION public.is_portal_member() SET SCHEMA app_private;
ALTER FUNCTION public.is_portal_staff() SET SCHEMA app_private;
ALTER FUNCTION public.current_driver_id() SET SCHEMA app_private;