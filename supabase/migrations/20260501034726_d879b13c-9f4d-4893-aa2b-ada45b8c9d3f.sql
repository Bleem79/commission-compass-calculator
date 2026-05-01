-- 1. Allow drivers to view their own absent fines
CREATE POLICY "Drivers can view their own fines"
ON public.driver_absent_fines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_credentials dc
    WHERE dc.user_id = auth.uid()
      AND dc.driver_id = driver_absent_fines.driver_id
      AND dc.status = 'enabled'
  )
);

-- 2. Harden get_driver_credentials: require caller matches p_user_id
CREATE OR REPLACE FUNCTION public.get_driver_credentials(p_driver_id text, p_user_id uuid)
 RETURNS TABLE(id uuid, driver_id text, status text, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credential RECORD;
BEGIN
  -- Authorization: caller must be authenticated and acting on their own user_id
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot link credentials for another user';
  END IF;

  SELECT dc.id, dc.driver_id, dc.status, dc.user_id
  INTO v_credential
  FROM driver_credentials dc
  WHERE dc.user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_credential.id, v_credential.driver_id, v_credential.status, v_credential.user_id;
    RETURN;
  END IF;

  SELECT dc.id, dc.driver_id, dc.status, dc.user_id
  INTO v_credential
  FROM driver_credentials dc
  WHERE dc.driver_id = p_driver_id
  LIMIT 1;

  IF FOUND THEN
    IF v_credential.user_id IS NULL THEN
      UPDATE driver_credentials
      SET user_id = p_user_id
      WHERE driver_credentials.id = v_credential.id;

      v_credential.user_id := p_user_id;
    END IF;

    RETURN QUERY SELECT v_credential.id, v_credential.driver_id, v_credential.status, v_credential.user_id;
    RETURN;
  END IF;

  RETURN;
END;
$function$;