-- Create a function to get and link driver credentials securely
-- This runs with SECURITY DEFINER to bypass RLS and link user_id if needed
CREATE OR REPLACE FUNCTION public.get_driver_credentials(p_driver_id TEXT, p_user_id UUID)
RETURNS TABLE(
  id UUID,
  driver_id TEXT,
  status TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credential RECORD;
BEGIN
  -- First, try to find credentials by user_id
  SELECT dc.id, dc.driver_id, dc.status, dc.user_id
  INTO v_credential
  FROM driver_credentials dc
  WHERE dc.user_id = p_user_id
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT v_credential.id, v_credential.driver_id, v_credential.status, v_credential.user_id;
    RETURN;
  END IF;
  
  -- If not found by user_id, try to find by driver_id
  SELECT dc.id, dc.driver_id, dc.status, dc.user_id
  INTO v_credential
  FROM driver_credentials dc
  WHERE dc.driver_id = p_driver_id
  LIMIT 1;
  
  IF FOUND THEN
    -- Link the user_id if it was null
    IF v_credential.user_id IS NULL THEN
      UPDATE driver_credentials
      SET user_id = p_user_id
      WHERE driver_credentials.id = v_credential.id;
      
      v_credential.user_id := p_user_id;
    END IF;
    
    RETURN QUERY SELECT v_credential.id, v_credential.driver_id, v_credential.status, v_credential.user_id;
    RETURN;
  END IF;
  
  -- No credentials found
  RETURN;
END;
$$;