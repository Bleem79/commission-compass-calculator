CREATE TABLE public.sharjah_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sharjah_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sharjah locations"
ON public.sharjah_locations FOR SELECT USING (true);

CREATE POLICY "Admins can insert sharjah locations"
ON public.sharjah_locations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sharjah locations"
ON public.sharjah_locations FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sharjah locations"
ON public.sharjah_locations FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));