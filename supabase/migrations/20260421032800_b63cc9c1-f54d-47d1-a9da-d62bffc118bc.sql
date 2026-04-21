-- Calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  event_name TEXT NOT NULL,
  maps_link TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_date ON public.calendar_events(event_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view calendar events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update calendar events"
  ON public.calendar_events FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete calendar events"
  ON public.calendar_events FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Upload history table
CREATE TABLE public.calendar_events_upload_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL DEFAULT 'upload',
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events_upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view upload history"
  ON public.calendar_events_upload_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert upload history"
  ON public.calendar_events_upload_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete upload history"
  ON public.calendar_events_upload_history FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Driver portal toggle for calendar events
INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
VALUES ('calendar_events', 'Calendar Events', true)
ON CONFLICT DO NOTHING;