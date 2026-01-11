-- Create warning_letters table
CREATE TABLE public.warning_letters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    taxi_no text,
    driver_id text NOT NULL,
    name text,
    reasons text,
    action_taken text NOT NULL DEFAULT '1-Warning Letter',
    document_no text,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.warning_letters ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all warning letters
CREATE POLICY "Admins can view all warning letters"
ON public.warning_letters
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can insert warning letters
CREATE POLICY "Admins can insert warning letters"
ON public.warning_letters
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can update warning letters
CREATE POLICY "Admins can update warning letters"
ON public.warning_letters
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Admins can delete warning letters
CREATE POLICY "Admins can delete warning letters"
ON public.warning_letters
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Drivers can view their own warning letters
CREATE POLICY "Drivers can view their own warning letters"
ON public.warning_letters
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = warning_letters.driver_id
    AND dc.status = 'enabled'::text
));