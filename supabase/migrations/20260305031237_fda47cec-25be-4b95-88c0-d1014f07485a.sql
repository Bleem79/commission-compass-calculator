INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
VALUES ('video_tutorials', 'Video Tutorials', true)
ON CONFLICT DO NOTHING;