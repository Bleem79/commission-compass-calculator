CREATE TABLE public.driver_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id text NOT NULL,
  driver_name text,
  training_name text NOT NULL,
  training_date date NOT NULL,
  training_time text,
  room_no text,
  attendance text NOT NULL DEFAULT 'pending',
  marked_by uuid,
  marked_at timestamptz,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_trainings TO authenticated;
GRANT ALL ON public.driver_trainings TO service_role;
ALTER TABLE public.driver_trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers view own trainings" ON public.driver_trainings FOR SELECT TO authenticated
  USING (driver_id IN (SELECT dc.driver_id FROM public.driver_credentials dc WHERE dc.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advanced'::app_role));
CREATE POLICY "Admins insert trainings" ON public.driver_trainings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff update trainings" ON public.driver_trainings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advanced'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advanced'::app_role));
CREATE POLICY "Admins delete trainings" ON public.driver_trainings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE OR REPLACE FUNCTION public.validate_driver_training() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.attendance NOT IN ('pending','present','absent') THEN RAISE EXCEPTION 'Invalid attendance'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER validate_driver_training BEFORE INSERT OR UPDATE ON public.driver_trainings
  FOR EACH ROW EXECUTE FUNCTION public.validate_driver_training();
CREATE INDEX driver_trainings_driver_idx ON public.driver_trainings(driver_id);