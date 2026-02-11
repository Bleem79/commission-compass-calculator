// Request types and constants shared across driver request pages
export const REQUEST_TYPES = [
  { value: "single_to_double", label: "Single to Double" },
  { value: "double_to_single", label: "Double to Single" },
  { value: "cng_to_hybrid", label: "CNG to Hybrid" },
  { value: "day_off", label: "Day Off" },
  { value: "other", label: "Other" },
];

export const MAX_DAY_OFF_PER_CYCLE = 2; // Maximum day off requests per billing cycle (26th to 25th)
export const MAX_DAY_OFF_PER_DAY = 40; // Maximum day off requests per day

export interface DriverRequest {
  id: string;
  driver_id: string;
  driver_name: string | null;
  request_type: string;
  subject: string;
  description: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  request_no: string | null;
}

export const getRequestTypeLabel = (value: string): string => {
  return REQUEST_TYPES.find((t) => t.value === value)?.label || value;
};
