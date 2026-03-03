
-- Add fleet_remarks column to driver_requests
ALTER TABLE public.driver_requests ADD COLUMN fleet_remarks text DEFAULT NULL;

-- Allow fleet user to update only fleet_remarks on non-pending requests
CREATE POLICY "Fleet user can add remarks"
ON public.driver_requests
FOR UPDATE
USING (
  public.is_fleet_user()
  AND status IN ('approved', 'in_progress')
)
WITH CHECK (
  public.is_fleet_user()
  AND status IN ('approved', 'in_progress')
);
