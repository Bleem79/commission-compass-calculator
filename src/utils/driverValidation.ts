
import { DriverData } from "@/types/driver";

export const validateDriverData = (email: string, password: string, driverId: string) => {
  // Normalize inputs
  const emailStr = String(email).trim().toLowerCase();
  const passwordStr = String(password).trim();
  const driverIdStr = String(driverId).trim();
  
  if (!emailStr || !passwordStr || !driverIdStr) {
    throw new Error(`Missing required fields for driver: ${email}`);
  }
  
  if (!emailStr.includes('@')) {
    throw new Error(`Invalid email format: ${email}`);
  }
  
  if (passwordStr.length < 6) {
    throw new Error(`Password for ${email} is too short (minimum 6 characters)`);
  }

  return { emailStr, passwordStr, driverIdStr };
};
