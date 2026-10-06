CREATE OR REPLACE FUNCTION public.log_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_response IS DISTINCT FROM OLD.admin_response THEN
    SELECT COALESCE(raw_user_meta_data->>'username', email) INTO v_name FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.request_status_history(request_id, old_status, new_status, changed_by, changed_by_name, admin_response)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_name, NEW.admin_response);
  ELSIF NEW.fleet_remarks IS DISTINCT FROM OLD.fleet_remarks THEN
    SELECT COALESCE(raw_user_meta_data->>'username', email) INTO v_name FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.request_status_history(request_id, old_status, new_status, changed_by, changed_by_name, admin_response)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_name, 'Fleet remarks: ' || COALESCE(NEW.fleet_remarks, '(cleared)'));
  END IF;
  RETURN NEW;
END; $function$