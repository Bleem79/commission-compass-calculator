CREATE OR REPLACE FUNCTION public.import_safe_parking(p_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ DECLARE r jsonb; saved integer := 0; skipped integer := 0; BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Only administrators can import Safe Parking'; END IF;
IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Import must contain 1 to 5000 rows'; END IF;
FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
IF r->>'parking_name' IS NULL OR r->>'area_name' IS NULL OR r->>'latitude' IS NULL OR r->>'longitude' IS NULL THEN RAISE EXCEPTION 'Each row needs a parking name, area, latitude and longitude'; END IF;
BEGIN
INSERT INTO public.safe_parking(parking_name, area_name, latitude, longitude) VALUES (r->>'parking_name', r->>'area_name', (r->>'latitude')::double precision, (r->>'longitude')::double precision);
saved := saved + 1;
EXCEPTION WHEN unique_violation THEN skipped := skipped + 1;
END;
END LOOP; RETURN jsonb_build_object('saved',saved,'skipped',skipped); END; $$;
REVOKE ALL ON FUNCTION public.import_safe_parking(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_safe_parking(jsonb) TO authenticated, service_role;