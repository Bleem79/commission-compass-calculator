// Supabase Edge Function: reset-driver-password
// Resets a driver's password using admin credentials
//
// Security:
// - Requires a valid JWT
// - Verifies caller is an admin via public.user_roles

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("reset-driver-password: missing env vars");
    return json(500, { error: "Server misconfiguration" });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.replace(/^bearer\s+/i, "")
      : null;

    if (!token) {
      return json(401, { error: "Unauthorized" });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify the caller's identity
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.log("reset-driver-password: unauthorized", { userError: userError?.message });
      return json(401, { error: "Unauthorized" });
    }

    const callerId = userData.user.id;

    // Verify caller is admin
    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("reset-driver-password: role check failed", roleError);
      return json(500, { error: "Role check failed" });
    }

    if (!adminRole) {
      console.log("reset-driver-password: forbidden (not admin)", { callerId });
      return json(403, { error: "Forbidden: admin access required" });
    }

    // Parse request body
    let body: { driverId?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const driverId = String(body.driverId ?? "").trim();
    const newPassword = String(body.newPassword ?? "").trim();

    if (!driverId) {
      return json(400, { error: "Missing driverId" });
    }

    if (!newPassword) {
      return json(400, { error: "Missing newPassword" });
    }

    if (newPassword.length < 6) {
      return json(400, { error: "Password must be at least 6 characters" });
    }

    console.log(`reset-driver-password: caller=${callerId} resetting password for driver=${driverId}`);

    // Find the driver credentials to get the user_id
    const { data: driverCredentials, error: credError } = await adminClient
      .from("driver_credentials")
      .select("user_id")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (credError) {
      console.error("reset-driver-password: failed to find driver credentials", credError);
      return json(500, { error: "Failed to find driver credentials" });
    }

    if (!driverCredentials) {
      return json(404, { error: `Driver ${driverId} not found` });
    }

    const userId = driverCredentials.user_id;

    if (!userId) {
      // If no user_id linked, try to find by email pattern
      const email = `${driverId.toLowerCase()}@driver.temp`;
      const { data: users, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      if (listError) {
        console.error("reset-driver-password: failed to list users", listError);
        return json(500, { error: "Failed to find user" });
      }

      // Search for user by email
      let foundUserId: string | null = null;
      let page = 1;
      const perPage = 1000;

      while (!foundUserId) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        for (const u of data.users) {
          if (u.email?.toLowerCase() === email) {
            foundUserId = u.id;
            break;
          }
        }

        if (!data.nextPage || data.nextPage <= page) break;
        page = data.nextPage;
      }

      if (!foundUserId) {
        return json(404, { error: `No auth user found for driver ${driverId}` });
      }

      // Update the password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(foundUserId, {
        password: newPassword,
      });

      if (updateError) {
        console.error("reset-driver-password: failed to update password", updateError);
        return json(500, { error: `Failed to update password: ${updateError.message}` });
      }

      // Link the user_id to driver_credentials
      await adminClient
        .from("driver_credentials")
        .update({ user_id: foundUserId })
        .eq("driver_id", driverId);

      console.log(`reset-driver-password: successfully reset password for driver=${driverId}`);
      return json(200, { success: true, message: `Password reset for driver ${driverId}` });
    }

    // Update the password using the user_id
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("reset-driver-password: failed to update password", updateError);
      return json(500, { error: `Failed to update password: ${updateError.message}` });
    }

    console.log(`reset-driver-password: successfully reset password for driver=${driverId}`);
    return json(200, { success: true, message: `Password reset for driver ${driverId}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reset-driver-password: unhandled error", msg);
    return json(500, { error: msg });
  }
});
