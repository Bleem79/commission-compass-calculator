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
  success: Array<{ driverId: string }>;
  errors: Array<{ driverId: string; error: string }>;
  total: number;
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
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

    // If replacing, snapshot existing mapping before clearing.
    const existingMap = new Map<string, string>();
    if (replaceExisting) {
      const { data: existingCreds, error: existingErr } = await adminClient
        .from("driver_credentials")
        .select("driver_id,user_id");

      if (existingErr) {
        console.error("driver-credentials-bulk: failed to read existing driver_credentials", existingErr);
        return json(500, { error: "Failed to read existing driver credentials" });
      }

      for (const row of existingCreds ?? []) {
        if (row?.driver_id && row?.user_id) existingMap.set(String(row.driver_id), String(row.user_id));
      }

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
    };

    let emailLookup: Map<string, string> | null = null;

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
        let userId: string | null = existingMap.get(driverId) ?? null;

        if (userId) {
          const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, { password });
          if (updErr) throw updErr;
        } else {
          const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { driver_id: driverId },
          });

          if (createErr) {
            // If user already exists (e.g., previous partial run), resolve id by email once.
            if (String(createErr.message ?? "").toLowerCase().includes("already")) {
              if (!emailLookup) {
                console.log("driver-credentials-bulk: building email lookup (createUser already-exists)");
                emailLookup = await buildEmailLookup(adminClient);
              }
              userId = emailLookup.get(email.toLowerCase()) ?? null;
              if (!userId) throw createErr;

              const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, { password });
              if (updErr) throw updErr;
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
        result.success.push({ driverId });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`driver-credentials-bulk: failed processing driver ${driverId}`, msg);
        result.errors.push({ driverId, error: msg });
      }
    }

    // Persist successful rows (bulk upsert for speed)
    if (credentialRows.length > 0) {
      const { error: credErr } = await adminClient
        .from("driver_credentials")
        .upsert(credentialRows, { onConflict: "driver_id" });
      if (credErr) {
        console.error("driver-credentials-bulk: bulk upsert driver_credentials failed", credErr);
        return json(500, { error: `Failed to write driver credentials: ${credErr.message}` });
      }
    }

    if (roleRows.length > 0) {
      const { error: rErr } = await adminClient
        .from("user_roles")
        .upsert(roleRows, { onConflict: "user_id,role" });
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
