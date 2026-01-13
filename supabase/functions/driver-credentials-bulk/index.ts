// Supabase Edge Function: driver-credentials-bulk
// Creates/updates driver auth users and syncs public.driver_credentials.
//
// Security:
// - Requires a valid JWT (verify_jwt default = true)
// - Verifies caller is an admin via public.user_roles

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IncomingDriver = {
  driverId?: string;
  password?: string;
  status?: string;
};

type DriverUploadResult = {
  success: Array<{ driverId: string; isNew: boolean }>;
  errors: Array<{ driverId: string; error: string }>;
  total: number;
  newCount: number;
  updatedCount: number;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeStatus(status: unknown): "enabled" | "disabled" {
  const s = String(status ?? "enabled").trim().toLowerCase();
  return s === "disabled" ? "disabled" : "enabled";
}

// Build email lookup ONCE at the start for faster existing user detection
async function buildEmailLookup(adminClient: ReturnType<typeof createClient>) {
  const emailToId = new Map<string, string>();

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const u of data.users) {
      const email = (u.email ?? "").toLowerCase();
      if (email) emailToId.set(email, u.id);
    }

    if (!data.nextPage || data.nextPage <= page) break;
    page = data.nextPage;
  }

  return emailToId;
}

// Build driver_id to user_id lookup from driver_credentials table
async function buildDriverIdLookup(adminClient: ReturnType<typeof createClient>) {
  const driverToUserId = new Map<string, string>();
  
  const { data: existingCreds, error } = await adminClient
    .from("driver_credentials")
    .select("driver_id,user_id");

  if (error) {
    console.error("driver-credentials-bulk: failed to read driver_credentials", error);
    return driverToUserId;
  }

  for (const row of existingCreds ?? []) {
    if (row?.driver_id && row?.user_id) {
      driverToUserId.set(String(row.driver_id), String(row.user_id));
    }
  }

  return driverToUserId;
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("driver-credentials-bulk: missing env vars", {
      hasUrl: !!supabaseUrl,
      hasAnon: !!anonKey,
      hasService: !!serviceRoleKey,
    });
    return json(500, { error: "Server misconfiguration" });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const hasAuthHeader = authHeader.toLowerCase().startsWith("bearer ");
    
    // Extract the JWT token from the Authorization header
    const token = hasAuthHeader ? authHeader.replace(/^bearer\s+/i, "") : null;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Use the admin client to get user from the JWT token
    if (!token) {
      console.log("driver-credentials-bulk: no token provided");
      return json(401, { error: "Unauthorized" });
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.log("driver-credentials-bulk: unauthorized", { hasAuthHeader, userError: userError?.message });
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
      console.error("driver-credentials-bulk: role check failed", roleError);
      return json(500, { error: "Role check failed" });
    }

    if (!adminRole) {
      console.log("driver-credentials-bulk: forbidden (not admin)", { callerId });
      return json(403, { error: "Forbidden: admin access required" });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const drivers = (body?.drivers ?? []) as IncomingDriver[];
    const replaceExisting = Boolean(body?.replaceExisting ?? true);

    const MAX_DRIVERS_PER_REQUEST = 200;
    if (!Array.isArray(drivers) || drivers.length === 0) {
      return json(400, { error: "No drivers provided" });
    }

    if (drivers.length > MAX_DRIVERS_PER_REQUEST) {
      return json(413, {
        error: `Too many drivers in one request (${drivers.length}). Please upload in smaller batches (<= ${MAX_DRIVERS_PER_REQUEST}).`,
      });
    }

    console.log(
      `driver-credentials-bulk: caller=${callerId} received ${drivers.length} drivers (replaceExisting=${replaceExisting})`
    );

    // Build email lookup ONCE at the start (much faster than per-driver lookup)
    console.log("driver-credentials-bulk: building email lookup...");
    const emailLookup = await buildEmailLookup(adminClient);
    console.log(`driver-credentials-bulk: found ${emailLookup.size} existing users`);

    // Build driver_id to user_id lookup for existing credentials
    const existingDriverMap = await buildDriverIdLookup(adminClient);
    console.log(`driver-credentials-bulk: found ${existingDriverMap.size} existing driver credentials`);

    // If replacing (first chunk), clear existing credentials
    if (replaceExisting) {
      const { error: deleteErr } = await adminClient
        .from("driver_credentials")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteErr) {
        console.error("driver-credentials-bulk: failed to clear existing driver_credentials", deleteErr);
        return json(500, { error: "Failed to clear existing driver credentials" });
      }
    }

    const result: DriverUploadResult = {
      success: [],
      errors: [],
      total: drivers.length,
      newCount: 0,
      updatedCount: 0,
    };

    const credentialRows: Array<{ driver_id: string; user_id: string; status: string }> = [];
    const roleRows: Array<{ user_id: string; role: string }> = [];

    for (const raw of drivers) {
      const driverId = String(raw?.driverId ?? "").trim();
      const password = String(raw?.password ?? "").trim();
      const status = normalizeStatus(raw?.status);

      if (!driverId) {
        result.errors.push({ driverId: "(missing)", error: "Missing driverId" });
        continue;
      }

      if (!password) {
        result.errors.push({ driverId, error: "Missing password" });
        continue;
      }

      const email = `${driverId.toLowerCase()}@driver.temp`;

      try {
        // First check if user exists in email lookup (auth.users)
        let userId: string | null = emailLookup.get(email.toLowerCase()) ?? null;
        
        // Also check existing driver credentials map
        if (!userId) {
          userId = existingDriverMap.get(driverId) ?? null;
        }

        // Track if this is a new driver or existing one
        const isExistingDriver = !!userId;

        if (userId) {
          // User exists - update password
          const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, { password });
          if (updErr) throw updErr;
        } else {
          // User doesn't exist - create new
          const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { driver_id: driverId },
          });

          if (createErr) {
            // If user already exists (race condition), get from lookup
            if (String(createErr.message ?? "").toLowerCase().includes("already")) {
              // Try to get user by email directly
              const { data: existingUsers } = await adminClient.auth.admin.listUsers();
              const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
              
              if (existingUser) {
                userId = existingUser.id;
                const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, { password });
                if (updErr) throw updErr;
              } else {
                throw createErr;
              }
            } else {
              throw createErr;
            }
          } else {
            userId = created.user?.id ?? null;
          }
        }

        if (!userId) throw new Error("Could not determine user id");

        credentialRows.push({ driver_id: driverId, user_id: userId, status });
        roleRows.push({ user_id: userId, role: "driver" });
        
        // Track new vs updated
        if (isExistingDriver) {
          result.updatedCount++;
        } else {
          result.newCount++;
        }
        result.success.push({ driverId, isNew: !isExistingDriver });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`driver-credentials-bulk: failed processing driver ${driverId}`, msg);
        result.errors.push({ driverId, error: msg });
      }
    }

    // Deduplicate credential rows by driver_id (keep last occurrence)
    const uniqueCredentials = new Map<string, { driver_id: string; user_id: string; status: string }>();
    for (const row of credentialRows) {
      uniqueCredentials.set(row.driver_id, row);
    }
    const deduplicatedCredentials = Array.from(uniqueCredentials.values());

    // Log if there were duplicates (this is normal for drivers with multiple shifts)
    const duplicateCount = credentialRows.length - deduplicatedCredentials.length;
    if (duplicateCount > 0) {
      console.log(`driver-credentials-bulk: ${duplicateCount} duplicate driver_id entries (expected for multi-shift drivers)`);
    }

    // Keep all success entries - duplicates are expected for drivers with different shifts
    // The success count should reflect all rows processed from the CSV

    // Persist successful rows (bulk upsert for speed)
    if (deduplicatedCredentials.length > 0) {
      const { error: credErr } = await adminClient
        .from("driver_credentials")
        .upsert(deduplicatedCredentials, { onConflict: "driver_id" });
      if (credErr) {
        console.error("driver-credentials-bulk: bulk upsert driver_credentials failed", credErr);
        return json(500, { error: `Failed to write driver credentials: ${credErr.message}` });
      }
    }

    // Deduplicate role rows by user_id
    const uniqueRoles = new Map<string, { user_id: string; role: string }>();
    for (const row of roleRows) {
      uniqueRoles.set(row.user_id, row);
    }
    const deduplicatedRoles = Array.from(uniqueRoles.values());

    if (deduplicatedRoles.length > 0) {
      const { error: rErr } = await adminClient
        .from("user_roles")
        .upsert(deduplicatedRoles, { onConflict: "user_id,role" });
      if (rErr) {
        console.error("driver-credentials-bulk: bulk upsert user_roles failed", rErr);
        return json(500, { error: `Failed to write user roles: ${rErr.message}` });
      }
    }

    return json(200, result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("driver-credentials-bulk: unhandled error", msg);
    return json(500, { error: msg });
  }
});
