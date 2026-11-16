CREATE OR REPLACE FUNCTION public.mark_training_present_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.driver_trainings
     SET attendance = 'present', marked_by = NULL, marked_at = now()
   WHERE driver_id = NEW.driver_id
     AND attendance = 'pending';
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.mark_training_present_on_signature() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mark_training_present_on_signature ON public.training_acknowledgments;
CREATE TRIGGER mark_training_present_on_signature
AFTER INSERT ON public.training_acknowledgments
FOR EACH ROW EXECUTE FUNCTION public.mark_training_present_on_signature();