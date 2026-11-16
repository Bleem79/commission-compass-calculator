CREATE OR REPLACE FUNCTION app_private.is_training_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) IN ('training@amantaximena.com', 'training@amantaxi.com')
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role IN ('admin','advanced','user'))
  );
$$;
REVOKE ALL ON FUNCTION app_private.is_training_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_training_manager() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_manage_training()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT app_private.is_training_manager();
$$;
REVOKE ALL ON FUNCTION public.can_manage_training() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_training() TO authenticated, service_role;

CREATE POLICY "Training managers view trainings" ON public.driver_trainings
  FOR SELECT TO authenticated USING ((SELECT app_private.is_training_manager()));
CREATE POLICY "Training managers add trainings" ON public.driver_trainings
  FOR INSERT TO authenticated WITH CHECK ((SELECT app_private.is_training_manager()) AND uploaded_by = auth.uid());
CREATE POLICY "Training managers update attendance" ON public.driver_trainings
  FOR UPDATE TO authenticated USING ((SELECT app_private.is_training_manager())) WITH CHECK ((SELECT app_private.is_training_manager()));
CREATE POLICY "Training managers view acknowledgments" ON public.training_acknowledgments
  FOR SELECT TO authenticated USING ((SELECT app_private.is_training_manager()));