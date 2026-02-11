
-- Create table for driver request types (replaces localStorage)
CREATE TABLE public.driver_request_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_request_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read request types
CREATE POLICY "Anyone can view request types"
ON public.driver_request_types
FOR SELECT
USING (true);

-- Only admins can manage request types
CREATE POLICY "Admins can insert request types"
ON public.driver_request_types
FOR INSERT
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can update request types"
ON public.driver_request_types
FOR UPDATE
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete request types"
ON public.driver_request_types
FOR DELETE
USING (public.has_admin_role(auth.uid()));

-- Seed default request types
INSERT INTO public.driver_request_types (value, label, sort_order) VALUES
  ('single_to_double', 'Single to Double', 1),
  ('double_to_single', 'Double to Single', 2),
  ('cng_to_hybrid', 'CNG to Hybrid', 3),
  ('day_off', 'Day Off', 4),
  ('other', 'Other', 5);
