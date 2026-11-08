INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
VALUES
  ('driver_training', 'My Training', true),
  ('entry_pass', 'Entry Pass', true)
ON CONFLICT (feature_key) DO NOTHING;

UPDATE public.driver_portal_settings SET feature_name = 'Booking Rejection' WHERE feature_key = 'warning_letter';
UPDATE public.driver_portal_settings SET feature_name = 'Total Balance' WHERE feature_key = 'total_outstanding';