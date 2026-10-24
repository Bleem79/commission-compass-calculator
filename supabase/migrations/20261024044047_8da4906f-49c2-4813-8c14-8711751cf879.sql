CREATE TABLE public.safe_parking (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parking_name text NOT NULL, area_name text NOT NULL, latitude double precision NOT NULL, longitude double precision NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_parking TO authenticated;
GRANT ALL ON public.safe_parking TO service_role;
ALTER TABLE public.safe_parking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users view safe parking" ON public.safe_parking FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins create safe parking" ON public.safe_parking FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins edit safe parking" ON public.safe_parking FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete safe parking" ON public.safe_parking FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE OR REPLACE FUNCTION public.validate_safe_parking() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
NEW.parking_name := btrim(NEW.parking_name); NEW.area_name := btrim(NEW.area_name);
IF length(NEW.parking_name) NOT BETWEEN 1 AND 200 OR length(NEW.area_name) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Parking name and area must contain 1 to 200 characters'; END IF;
IF NEW.latitude IS NULL OR NOT (NEW.latitude BETWEEN -90 AND 90) OR NEW.longitude IS NULL OR NOT (NEW.longitude BETWEEN -180 AND 180) THEN RAISE EXCEPTION 'Latitude must be -90 to 90 and longitude -180 to 180'; END IF;
NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER validate_safe_parking BEFORE INSERT OR UPDATE ON public.safe_parking FOR EACH ROW EXECUTE FUNCTION public.validate_safe_parking();
CREATE UNIQUE INDEX safe_parking_location_unique ON public.safe_parking (lower(parking_name), lower(area_name), latitude, longitude);