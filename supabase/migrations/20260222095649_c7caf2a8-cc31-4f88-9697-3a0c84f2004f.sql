
-- Create entry_passes table
CREATE TABLE public.entry_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_no TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  driver_name TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;

-- Drivers can insert their own entry passes
CREATE POLICY "Drivers can insert their own entry passes"
ON public.entry_passes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = entry_passes.driver_id
    AND dc.status = 'enabled'
  )
);

-- Drivers can view their own entry passes
CREATE POLICY "Drivers can view their own entry passes"
ON public.entry_passes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_credentials dc
    WHERE dc.user_id = auth.uid()
    AND dc.driver_id = entry_passes.driver_id
    AND dc.status = 'enabled'
  )
);

-- Admins can view all entry passes
CREATE POLICY "Admins can view all entry passes"
ON public.entry_passes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Staff can view all entry passes
CREATE POLICY "Staff can view all entry passes"
ON public.entry_passes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'advanced'::app_role) OR
  has_role(auth.uid(), 'user'::app_role)
);

-- Auto-generate entry_no
CREATE OR REPLACE FUNCTION public.generate_entry_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_entry_no TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.entry_passes
  WHERE entry_no LIKE 'EP-' || v_year || '-%';
  
  v_entry_no := 'EP-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  
  WHILE EXISTS (SELECT 1 FROM public.entry_passes WHERE entry_no = v_entry_no) LOOP
    v_count := v_count + 1;
    v_entry_no := 'EP-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  END LOOP;
  
  NEW.entry_no := v_entry_no;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_entry_passes_entry_no
BEFORE INSERT ON public.entry_passes
FOR EACH ROW
EXECUTE FUNCTION public.generate_entry_no();
