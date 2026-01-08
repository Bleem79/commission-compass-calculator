-- Add admin role for existing user rev.counter@amantaximena.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'rev.counter@amantaximena.com'
ON CONFLICT DO NOTHING;