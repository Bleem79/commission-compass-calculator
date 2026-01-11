-- Add request_no column to driver_requests table
ALTER TABLE public.driver_requests 
ADD COLUMN request_no TEXT UNIQUE;

-- Create a function to generate unique request numbers
CREATE OR REPLACE FUNCTION public.generate_request_no()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_request_no TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the count of requests for the current year
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.driver_requests
  WHERE request_no LIKE 'REQ-' || v_year || '-%';
  
  -- Generate the request number: REQ-YYYY-XXXXX
  v_request_no := 'REQ-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  
  -- Ensure uniqueness by checking and incrementing if needed
  WHILE EXISTS (SELECT 1 FROM public.driver_requests WHERE request_no = v_request_no) LOOP
    v_count := v_count + 1;
    v_request_no := 'REQ-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  END LOOP;
  
  NEW.request_no := v_request_no;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate request number on insert
CREATE TRIGGER set_request_no
BEFORE INSERT ON public.driver_requests
FOR EACH ROW
WHEN (NEW.request_no IS NULL)
EXECUTE FUNCTION public.generate_request_no();