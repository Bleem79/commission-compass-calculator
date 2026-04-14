CREATE TABLE public.total_outstanding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_heading TEXT DEFAULT NULL,
  report_note TEXT DEFAULT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.total_outstanding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view total_outstanding_settings"
  ON public.total_outstanding_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert total_outstanding_settings"
  ON public.total_outstanding_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update total_outstanding_settings"
  ON public.total_outstanding_settings FOR UPDATE TO authenticated USING (true);