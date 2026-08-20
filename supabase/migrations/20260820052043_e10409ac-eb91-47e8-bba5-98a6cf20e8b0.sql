CREATE TABLE public.yango_driver_list (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  s_no integer,
  driver_id text NOT NULL,
  driver_name text,
  gender text,
  nationality text,
  mobile_no text,
  status text,
  hr_status text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.yango_driver_list TO authenticated;
GRANT ALL ON public.yango_driver_list TO service_role;

ALTER TABLE public.yango_driver_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view yango driver list"
ON public.yango_driver_list FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and advanced can insert yango driver list"
ON public.yango_driver_list FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advanced'::app_role));

CREATE POLICY "Admins and advanced can delete yango driver list"
ON public.yango_driver_list FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advanced'::app_role));

CREATE INDEX idx_yango_driver_list_driver_id ON public.yango_driver_list (driver_id);