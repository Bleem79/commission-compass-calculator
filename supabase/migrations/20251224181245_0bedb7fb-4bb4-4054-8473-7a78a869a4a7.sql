-- Create a table to store the report heading
CREATE TABLE public.driver_income_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_heading text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.driver_income_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read the settings
CREATE POLICY "Anyone can view settings" 
ON public.driver_income_settings 
FOR SELECT 
USING (true);

-- Only admins can insert/update settings
CREATE POLICY "Admins can insert settings" 
ON public.driver_income_settings 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins can update settings" 
ON public.driver_income_settings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));