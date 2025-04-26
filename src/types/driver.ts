
export interface DriverData {
  email: string;
  password: string;
  driverId: string;
}

export interface DriverCreationResult {
  success: Array<{ email: string; driverId: string }>;
  errors: Array<{ email: string; error: string }>;
}
