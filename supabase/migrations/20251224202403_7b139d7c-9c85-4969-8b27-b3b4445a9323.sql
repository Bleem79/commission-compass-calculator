-- Fix create_driver_account to find pgcrypto functions installed in the `extensions` schema
-- (gen_salt / crypt). The function previously set search_path to only `public`,
-- causing `function gen_salt(unknown) does not exist`.

CREATE OR REPLACE FUNCTION public.create_driver_account(p_email text, p_password text, p_driver_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Security: restrict to admins only
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create driver accounts';
  END IF;

  -- Prevent duplicates by driver_id
  IF EXISTS (SELECT 1 FROM public.driver_credentials WHERE driver_id = p_driver_id) THEN
    RAISE EXCEPTION 'Driver ID % already exists', p_driver_id;
  END IF;

  -- Find existing user by email (case-insensitive)
  SELECT id
    INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email);

  -- If user doesn't exist, create and auto-confirm
  IF v_user_id IS NULL THEN
    v_user_id := auth.users_insert_raw(
      row(
        NULL,                  -- id
        lower(p_email),        -- email
        NULL,                  -- aud
        extensions.crypt(p_password, extensions.gen_salt('bf')), -- encrypted_password
        now(),                 -- created_at
        now(),                 -- updated_at
        now(),                 -- last_sign_in_at
        NULL,                  -- raw_app_meta_data
        NULL,                  -- raw_user_meta_data
        NULL,                  -- is_super_admin
        NULL,                  -- email_change
        '',                    -- email_change_token_new
        NULL,                  -- email_change_confirm_status
        NULL,                  -- confirmation_token
        NULL,                  -- confirmation_sent_at
        true,                  -- email_confirmed_at
        NULL,                  -- phone
        NULL,                  -- phone_change
        '',                    -- phone_change_token
        NULL,                  -- phone_change_sent_at
        '',                    -- recovery_token
        NULL,                  -- recovery_sent_at
        NULL,                  -- email_change_verify_token
        NULL,                  -- email_change_verify_sent_at
        NULL,                  -- invite_token
        NULL,                  -- invite_sent_at
        0,                     -- invitation_acceptance_count
        NULL,                  -- deleted_at
        NULL,                  -- banned_until
        NULL                   -- json
      )
    );
  END IF;

  -- Create driver credentials (status defaults to enabled)
  INSERT INTO public.driver_credentials (user_id, driver_id)
  VALUES (v_user_id, p_driver_id);

  -- Assign driver role (safe if unique constraint exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'driver')
  ON CONFLICT DO NOTHING;

  RETURN v_user_id;
END;
$function$;
