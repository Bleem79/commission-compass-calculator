
CREATE TABLE public.driver_master_file (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  controller TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by TEXT NOT NULL
);

ALTER TABLE public.driver_master_file ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage driver master file"
ON public.driver_master_file
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can view driver master file"
ON public.driver_master_file
FOR SELECT
USING (auth.uid() IS NOT NULL);
