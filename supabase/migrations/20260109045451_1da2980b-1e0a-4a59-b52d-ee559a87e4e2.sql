-- Create driver_absent_fines table
CREATE TABLE public.driver_absent_fines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fine_no text NOT NULL,
  driver_id text NOT NULL,
  vehicle_number text NOT NULL,
  fine_type text NOT NULL,
  driver_reason text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now(),
  entered_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.driver_absent_fines ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all fines" ON public.driver_absent_fines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can insert fines" ON public.driver_absent_fines
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can update fines" ON public.driver_absent_fines
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can delete fines" ON public.driver_absent_fines
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ));