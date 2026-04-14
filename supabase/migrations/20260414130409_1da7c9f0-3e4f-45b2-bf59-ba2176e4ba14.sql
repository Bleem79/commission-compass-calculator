
CREATE TABLE public.total_outstanding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_cde TEXT NOT NULL,
  fleet_status TEXT,
  accident NUMERIC DEFAULT 0,
  traffic_fines NUMERIC DEFAULT 0,
  shj_rta_fines NUMERIC DEFAULT 0,
  total_external_fines NUMERIC DEFAULT 0,
  total_outstanding NUMERIC DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.total_outstanding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view total_outstanding"
  ON public.total_outstanding FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert total_outstanding"
  ON public.total_outstanding FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete total_outstanding"
  ON public.total_outstanding FOR DELETE TO authenticated USING (true);
