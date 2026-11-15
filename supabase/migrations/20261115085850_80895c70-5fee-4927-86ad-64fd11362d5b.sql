-- Helper checks (based on server-side role table and admin-created driver credentials)
CREATE OR REPLACE FUNCTION public.is_portal_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.driver_credentials WHERE user_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin'::public.app_role, 'advanced'::public.app_role, 'user'::public.app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT driver_id FROM public.driver_credentials
  WHERE auth.uid() IS NOT NULL AND user_id = auth.uid()
  ORDER BY created_at NULLS LAST
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_portal_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_portal_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_driver_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_portal_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_portal_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_driver_id() TO authenticated, service_role;

-- Shared reference data: portal members only (not arbitrary self-registered accounts)
DROP POLICY IF EXISTS "Authenticated users can view badge catalog" ON public.driver_badge_catalog;
CREATE POLICY "Portal members can view badge catalog" ON public.driver_badge_catalog
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Signed-in users view training documents" ON public.training_documents;
CREATE POLICY "Portal members view training documents" ON public.training_documents
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Signed in users view safe parking" ON public.safe_parking;
CREATE POLICY "Portal members view safe parking" ON public.safe_parking
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Authenticated users can view calendar events" ON public.calendar_events;
CREATE POLICY "Portal members can view calendar events" ON public.calendar_events
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Anyone authenticated can view video tutorials" ON public.video_tutorials;
CREATE POLICY "Portal members can view video tutorials" ON public.video_tutorials
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Anyone can view settings" ON public.driver_income_settings;
CREATE POLICY "Portal members can view income settings" ON public.driver_income_settings
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Authenticated users can view survey questions" ON public.survey_questions;
CREATE POLICY "Portal members can view survey questions" ON public.survey_questions
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Anyone can view documents" ON public.documents;
CREATE POLICY "Portal members can view documents" ON public.documents
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Anyone authenticated can view target_trips_settings" ON public.target_trips_settings;
CREATE POLICY "Portal members can view target_trips_settings" ON public.target_trips_settings
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

DROP POLICY IF EXISTS "Anyone can view portal settings" ON public.driver_portal_settings;
CREATE POLICY "Portal members can view portal settings" ON public.driver_portal_settings
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));

-- Staff-only data
DROP POLICY IF EXISTS "Authenticated staff can view templates" ON public.nationality_message_templates;
CREATE POLICY "Staff can view templates" ON public.nationality_message_templates
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_staff()));

-- Driver-scoped data: staff see all, drivers see only their own rows
DROP POLICY IF EXISTS "Authenticated users can view driver master file" ON public.driver_master_file;
CREATE POLICY "Staff or own driver can view driver master file" ON public.driver_master_file
  FOR SELECT TO authenticated
  USING ((SELECT public.is_portal_staff()) OR driver_id = (SELECT public.current_driver_id()));

DROP POLICY IF EXISTS "auth read blocks" ON public.driver_request_blocks;
CREATE POLICY "Staff or own driver can view request blocks" ON public.driver_request_blocks
  FOR SELECT TO authenticated
  USING ((SELECT public.is_portal_staff()) OR driver_id = (SELECT public.current_driver_id()));

DROP POLICY IF EXISTS "Authenticated can view yango driver list" ON public.yango_driver_list;
CREATE POLICY "Staff or own driver can view yango driver list" ON public.yango_driver_list
  FOR SELECT TO authenticated
  USING ((SELECT public.is_portal_staff()) OR driver_id = (SELECT public.current_driver_id()));

DROP POLICY IF EXISTS "All users can view messages" ON public.admin_messages;
CREATE POLICY "Staff, broadcast and own private messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_portal_staff())
    OR (
      (SELECT public.is_portal_member())
      AND (
        content NOT LIKE '[PRIVATE TO:%'
        OR starts_with(content, '[PRIVATE TO: ' || (SELECT public.current_driver_id()) || ']')
      )
    )
  );

-- Total Balance
DROP POLICY IF EXISTS "Authenticated users can view total_outstanding" ON public.total_outstanding;
DROP POLICY IF EXISTS "Authenticated users can insert total_outstanding" ON public.total_outstanding;
DROP POLICY IF EXISTS "Authenticated users can delete total_outstanding" ON public.total_outstanding;
CREATE POLICY "Staff or own driver can view total_outstanding" ON public.total_outstanding
  FOR SELECT TO authenticated
  USING ((SELECT public.is_portal_staff()) OR lower(btrim(emp_cde)) = lower((SELECT public.current_driver_id())));
CREATE POLICY "Staff can insert total_outstanding" ON public.total_outstanding
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_portal_staff()));
CREATE POLICY "Staff can delete total_outstanding" ON public.total_outstanding
  FOR DELETE TO authenticated USING ((SELECT public.is_portal_staff()));

DROP POLICY IF EXISTS "Authenticated users can view total_outstanding_settings" ON public.total_outstanding_settings;
DROP POLICY IF EXISTS "Authenticated users can insert total_outstanding_settings" ON public.total_outstanding_settings;
DROP POLICY IF EXISTS "Authenticated users can update total_outstanding_settings" ON public.total_outstanding_settings;
CREATE POLICY "Portal members can view total_outstanding_settings" ON public.total_outstanding_settings
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_member()));
CREATE POLICY "Staff can insert total_outstanding_settings" ON public.total_outstanding_settings
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_portal_staff()));
CREATE POLICY "Staff can update total_outstanding_settings" ON public.total_outstanding_settings
  FOR UPDATE TO authenticated USING ((SELECT public.is_portal_staff())) WITH CHECK ((SELECT public.is_portal_staff()));

-- Storage: legacy buckets uploads restricted to admins
DROP POLICY IF EXISTS "Allow authenticated users to insert into mfuel-docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert into hotspot-docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert into info-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;
CREATE POLICY "Admins can upload to legacy document buckets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('mfuel-docs', 'hotspot-docs', 'info-docs')
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND owner_id = (SELECT auth.uid()::text)
  );

-- Storage: private declaration templates readable only by portal members
DROP POLICY IF EXISTS "Signed-in users read training documents files" ON storage.objects;
CREATE POLICY "Portal members read training documents files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'training-documents' AND (SELECT public.is_portal_member()));