-- Create driver_requests table
CREATE TABLE public.driver_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id text NOT NULL,
    driver_name text,
    request_type text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    admin_response text,
    responded_at timestamp with time zone,
    responded_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.driver_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.driver_requests
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can update requests (to respond)
CREATE POLICY "Admins can update requests"
ON public.driver_requests
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can delete requests
CREATE POLICY "Admins can delete requests"
ON public.driver_requests
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Drivers can insert their own requests
CREATE POLICY "Drivers can insert their own requests"
ON public.driver_requests
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = driver_requests.driver_id
    AND dc.status = 'enabled'::text
));

-- Drivers can view their own requests
CREATE POLICY "Drivers can view their own requests"
ON public.driver_requests
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = driver_requests.driver_id
    AND dc.status = 'enabled'::text
));