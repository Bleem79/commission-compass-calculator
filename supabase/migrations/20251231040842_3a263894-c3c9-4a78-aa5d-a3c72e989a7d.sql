-- Add is_pinned column to admin_messages table
ALTER TABLE public.admin_messages 
ADD COLUMN is_pinned boolean DEFAULT false;

-- Add RLS policy for admins to update messages (for pinning)
CREATE POLICY "Admins can update messages" 
ON public.admin_messages 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));