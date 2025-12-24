
import { DriverData } from "@/types/driver";

export const validateDriverData = (data: { password: string, driverId: string }) => {
  // Normalize inputs
  const password = String(data.password).trim();
  const driverId = String(data.driverId).trim();
  
  if (!password || !driverId) {
    throw new Error(`Missing required fields for driver: ${data.driverId}`);
  }
  
  if (password.length < 6) {
    throw new Error(`Password for ${data.driverId} is too short (minimum 6 characters)`);
  }

  return { password, driverId };
};
