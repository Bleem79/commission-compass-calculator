
-- Create storage bucket for portal user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload avatars
CREATE POLICY "Admins can upload user avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Allow admins to update avatars
CREATE POLICY "Admins can update user avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Allow admins to delete avatars
CREATE POLICY "Admins can delete user avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Allow public read access to avatars
CREATE POLICY "Anyone can view user avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');
