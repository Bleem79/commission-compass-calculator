
-- Add status and created_by columns to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN status text NOT NULL DEFAULT 'pending',
ADD COLUMN created_by uuid;

-- Allow staff (admin, advanced, user roles) to insert entry passes
CREATE POLICY "Staff can insert entry passes"
ON public.entry_passes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'advanced'::app_role) 
  OR has_role(auth.uid(), 'user'::app_role)
);

-- Allow admins to update entry passes (for status changes)
CREATE POLICY "Admins can update entry passes"
ON public.entry_passes
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete entry passes
CREATE POLICY "Admins can delete entry passes"
ON public.entry_passes
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
);
