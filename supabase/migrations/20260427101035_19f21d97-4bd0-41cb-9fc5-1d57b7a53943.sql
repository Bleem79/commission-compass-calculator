-- Ensure timestamp helper exists
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.driver_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  month TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  image_path TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_badges_driver_id ON public.driver_badges(driver_id);
CREATE INDEX idx_driver_badges_month ON public.driver_badges(month);

ALTER TABLE public.driver_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all driver badges"
  ON public.driver_badges FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert driver badges"
  ON public.driver_badges FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update driver badges"
  ON public.driver_badges FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete driver badges"
  ON public.driver_badges FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_driver_badges_updated_at
  BEFORE UPDATE ON public.driver_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-badges', 'driver-badges', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view driver badge images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-badges');

CREATE POLICY "Admins can upload driver badge images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'driver-badges' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update driver badge images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'driver-badges' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete driver badge images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'driver-badges' AND has_role(auth.uid(), 'admin'::app_role));