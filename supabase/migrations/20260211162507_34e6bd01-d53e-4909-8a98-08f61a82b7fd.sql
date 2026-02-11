-- Fix linter warnings: set immutable search_path on functions

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_guest_account(email text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN email LIKE 'guest_%@mfuel.temp';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_users_bulk(user_data jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
    user_record jsonb;
begin
    for user_record in select * from jsonb_array_elements(user_data) loop
        perform auth.create_user(
            email := user_record->>'email',
            password := user_record->>'password',
            data := user_record->'data'
        );
    end loop;
end;
$$;

-- Fix linter warning: overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert uploaded_files" ON public.uploaded_files;
CREATE POLICY "Users can insert uploaded_files"
ON public.uploaded_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);
