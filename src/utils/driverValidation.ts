
import { DriverData } from "@/types/driver";

export const validateDriverData = (data: { email: string, password: string, driverId: string }) => {
  // Normalize inputs
  const email = String(data.email).trim().toLowerCase();
  const password = String(data.password).trim();
  const driverId = String(data.driverId).trim();
  
  if (!email || !password || !driverId) {
    throw new Error(`Missing required fields for driver: ${data.email}`);
  }
  
  if (!email.includes('@')) {
    throw new Error(`Invalid email format: ${data.email}`);
  }
  
  if (password.length < 6) {
    throw new Error(`Password for ${data.email} is too short (minimum 6 characters)`);
  }

  return { email, password, driverId };
};
