INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled, updated_at)
VALUES ('total_outstanding', 'Total Outstanding', true, now())
ON CONFLICT DO NOTHING;