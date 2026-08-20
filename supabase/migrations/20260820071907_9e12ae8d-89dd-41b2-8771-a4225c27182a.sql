CREATE TABLE public.yango_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id text NOT NULL,
  shift text,
  no_of_trips integer,
  cash_income numeric,
  cashless_income numeric,
  total_income numeric,
  driver_income numeric,
  income_date date,
  vehicle_no text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.yango_income TO authenticated;
GRANT ALL ON public.yango_income TO service_role;

ALTER TABLE public.yango_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage yango income"
ON public.yango_income FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view yango income"
ON public.yango_income FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advanced'::app_role));

CREATE INDEX idx_yango_income_driver_id ON public.yango_income (driver_id);