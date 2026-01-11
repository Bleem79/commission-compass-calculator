-- Create target_trips table
CREATE TABLE public.target_trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id text NOT NULL,
    driver_name text,
    target_trips integer NOT NULL DEFAULT 0,
    completed_trips integer NOT NULL DEFAULT 0,
    month text NOT NULL,
    year integer NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.target_trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all target trips
CREATE POLICY "Admins can view all target trips"
ON public.target_trips
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can insert target trips
CREATE POLICY "Admins can insert target trips"
ON public.target_trips
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can update target trips
CREATE POLICY "Admins can update target trips"
ON public.target_trips
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can delete target trips
CREATE POLICY "Admins can delete target trips"
ON public.target_trips
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Drivers can view their own target trips
CREATE POLICY "Drivers can view their own target trips"
ON public.target_trips
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = target_trips.driver_id
    AND dc.status = 'enabled'::text
));