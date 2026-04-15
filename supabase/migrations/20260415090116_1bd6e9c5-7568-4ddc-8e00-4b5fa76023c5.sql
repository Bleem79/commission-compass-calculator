
CREATE TABLE public.osr_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OSR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by TEXT NOT NULL
);

ALTER TABLE public.osr_drivers ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_osr_drivers_driver_id ON public.osr_drivers (driver_id);

CREATE POLICY "Admins can manage OSR drivers"
ON public.osr_drivers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view OSR drivers"
ON public.osr_drivers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'advanced'::app_role));
