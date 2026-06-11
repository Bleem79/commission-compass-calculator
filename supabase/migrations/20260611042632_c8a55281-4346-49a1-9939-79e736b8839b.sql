INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
SELECT 'collect_payment', 'Collect Payment', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.driver_portal_settings WHERE feature_key = 'collect_payment'
);