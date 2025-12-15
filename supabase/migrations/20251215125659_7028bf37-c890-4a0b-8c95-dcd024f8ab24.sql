-- Create table to store driver income data
CREATE TABLE public.driver_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  driver_name TEXT,
  working_days INTEGER NOT NULL,
  total_income DECIMAL(10,2) NOT NULL,
  average_daily_income DECIMAL(10,2),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.driver_income ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all driver income data" 
ON public.driver_income 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert driver income data" 
ON public.driver_income 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update driver income data" 
ON public.driver_income 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete driver income data" 
ON public.driver_income 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);