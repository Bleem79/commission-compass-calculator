-- Create a function to count approved day off requests for a specific date
-- This function uses SECURITY DEFINER to bypass RLS and count all approved requests
CREATE OR REPLACE FUNCTION public.count_approved_day_off_requests(p_date_str TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM driver_requests
  WHERE request_type = 'day_off'
    AND status = 'approved'
    AND subject ILIKE '%' || p_date_str || '%';
  
  RETURN COALESCE(v_count, 0);
END;
$$;