-- Create a table for driver activity logs
CREATE TABLE public.driver_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all logs
CREATE POLICY "Admins can view all activity logs" 
ON public.driver_activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create policy for inserting logs (any authenticated user can log their own activity)
CREATE POLICY "Users can insert their own activity logs" 
ON public.driver_activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_driver_activity_logs_driver_id ON public.driver_activity_logs(driver_id);
CREATE INDEX idx_driver_activity_logs_created_at ON public.driver_activity_logs(created_at DESC);