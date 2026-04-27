CREATE TABLE public.driver_badge_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_badge_catalog_sort ON public.driver_badge_catalog(sort_order);

ALTER TABLE public.driver_badge_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view badge catalog"
  ON public.driver_badge_catalog FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert badge catalog"
  ON public.driver_badge_catalog FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update badge catalog"
  ON public.driver_badge_catalog FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete badge catalog"
  ON public.driver_badge_catalog FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_driver_badge_catalog_updated_at
  BEFORE UPDATE ON public.driver_badge_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();