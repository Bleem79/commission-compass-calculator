-- Fix: Remove overly permissive SELECT policies on uploaded_files table
-- Issue: PUBLIC_DATA_EXPOSURE - Two policies allow all authenticated users to view all uploads

-- Drop the overly permissive SELECT policies
DROP POLICY IF EXISTS "Allow select for all" ON public.uploaded_files;
DROP POLICY IF EXISTS "Users can view all uploaded files" ON public.uploaded_files;

-- Create owner-scoped SELECT policy - users can only view their own uploads
CREATE POLICY "Users can view own uploaded files"
ON public.uploaded_files
FOR SELECT
USING (auth.uid() = uploaded_by);

-- Create admin SELECT policy - admins can view all uploads
CREATE POLICY "Admins can view all uploaded files"
ON public.uploaded_files
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));