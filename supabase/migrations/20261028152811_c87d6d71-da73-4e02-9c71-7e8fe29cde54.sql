CREATE OR REPLACE FUNCTION public.get_driver_residence_rows(p_offset integer DEFAULT 0)
RETURNS TABLE(driver_id text, city text, area text, google_map text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Invalid offset';
  END IF;
  RETURN QUERY SELECT y.driver_id, y.city, y.area, y.google_map
    FROM public.yango_driver_list y
    ORDER BY y.created_at DESC, y.id DESC
    OFFSET p_offset LIMIT 1000;
END;
$$;
REVOKE ALL ON FUNCTION public.get_driver_residence_rows(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_residence_rows(integer) TO authenticated;