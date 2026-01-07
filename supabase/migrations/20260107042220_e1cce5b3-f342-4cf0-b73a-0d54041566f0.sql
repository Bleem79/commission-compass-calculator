-- Create storage bucket for admin message images
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-message-images', 'admin-message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view admin message images"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-message-images');

-- Only admins can upload images
CREATE POLICY "Admins can upload admin message images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-message-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can delete images
CREATE POLICY "Admins can delete admin message images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'admin-message-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add image_url column to admin_messages table
ALTER TABLE public.admin_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;