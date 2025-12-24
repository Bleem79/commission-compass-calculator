
import { DriverData } from "@/types/driver";

export const validateDriverData = (data: { password: string, driverId: string, status?: string }) => {
  // Normalize inputs
  const password = String(data.password).trim();
  const driverId = String(data.driverId).trim();
  const status = data.status ? String(data.status).trim().toLowerCase() : 'enabled';
  
  if (!password || !driverId) {
    throw new Error(`Missing required fields for driver: ${driverId}`);
  }
  
  if (password.length < 6) {
    throw new Error(`Password for ${driverId} is too short (minimum 6 characters)`);
  }
  
  // Validate status
  const validStatus = status === 'enabled' || status === 'disabled' ? status : 'enabled';

  return { password, driverId, status: validStatus };
};
