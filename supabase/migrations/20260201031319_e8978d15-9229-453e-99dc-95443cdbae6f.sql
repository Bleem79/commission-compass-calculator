-- Add Oil Change Booking to driver portal settings
INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
VALUES ('oil_change_booking', 'Oil Change Booking', true)
ON CONFLICT (feature_key) DO NOTHING;