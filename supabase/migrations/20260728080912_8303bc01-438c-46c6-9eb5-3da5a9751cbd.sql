CREATE TABLE public.driver_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  driver_id TEXT,
  driver_name TEXT,
  question TEXT NOT NULL DEFAULT 'Cashier Timings',
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.driver_surveys TO authenticated;
GRANT ALL ON public.driver_surveys TO service_role;

ALTER TABLE public.driver_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can insert own survey" ON public.driver_surveys
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can view own survey" ON public.driver_surveys
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all surveys" ON public.driver_surveys
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
SELECT 'survey', 'Survey', true
WHERE NOT EXISTS (SELECT 1 FROM public.driver_portal_settings WHERE feature_key = 'survey');

DELETE FROM public.driver_portal_settings WHERE feature_key = 'collect_payment';