
export interface DriverData {
  password: string;
  driverId: string;
  status?: string;
}

export interface DriverCreationResult {
  success: Array<{ driverId: string }>;
  errors: Array<{ driverId: string; error: string }>;
}
