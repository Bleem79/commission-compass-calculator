-- Create table for driver portal feature settings
CREATE TABLE public.driver_portal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.driver_portal_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for drivers to know what's enabled)
CREATE POLICY "Anyone can view portal settings"
ON public.driver_portal_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update portal settings"
ON public.driver_portal_settings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Only admins can insert settings
CREATE POLICY "Admins can insert portal settings"
ON public.driver_portal_settings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Insert default feature settings
INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled) VALUES
  ('driver_income', 'Driver Income', true),
  ('target_trips', 'Target Trips', true),
  ('absent_fine', 'Absent Fine', true),
  ('request', 'Request', true),
  ('warning_letter', 'Warning Letter', true),
  ('private_messages', 'Private Messages', true);