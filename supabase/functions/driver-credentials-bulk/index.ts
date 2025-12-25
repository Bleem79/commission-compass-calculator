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

function normalizeStatus(status: unknown): "enabled" | "disabled" {
  const s = String(status ?? "enabled").trim().toLowerCase();
  return s === "disabled" ? "disabled" : "enabled";
}

async function buildEmailLookup(adminClient: ReturnType<typeof createClient>) {
  const emailToId = new Map<string, string>();

  // GoTrue Admin API uses pagination; build a lookup once only if we hit duplicates.
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars", { hasUrl: !!supabaseUrl, hasAnon: !!anonKey, hasService: !!serviceRoleKey });
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      console.error("Role check failed", roleError);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const drivers = (body?.drivers ?? []) as IncomingDriver[];
    const replaceExisting = Boolean(body?.replaceExisting ?? true);

    if (!Array.isArray(drivers) || drivers.length === 0) {
      return new Response(JSON.stringify({ error: "No drivers provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`driver-credentials-bulk: received ${drivers.length} drivers (replaceExisting=${replaceExisting})`);

    // If replacing, snapshot existing mapping before clearing.
    const existingMap = new Map<string, string>();
    if (replaceExisting) {
      const { data: existingCreds, error: existingErr } = await adminClient
        .from("driver_credentials")
        .select("driver_id,user_id");

      if (existingErr) {
        console.error("Failed to read existing driver_credentials", existingErr);
        return new Response(JSON.stringify({ error: "Failed to read existing driver credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const row of existingCreds ?? []) {
        if (row?.driver_id && row?.user_id) existingMap.set(String(row.driver_id), String(row.user_id));
      }

      const { error: deleteErr } = await adminClient
        .from("driver_credentials")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteErr) {
        console.error("Failed to clear existing driver_credentials", deleteErr);
        return new Response(JSON.stringify({ error: "Failed to clear existing driver credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const result: DriverUploadResult = {
      success: [],
      errors: [],
      total: drivers.length,
    };

    let emailLookup: Map<string, string> | null = null;

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
            // If user already exists (e.g., credentials were deleted previously), resolve id by email once.
            if (String(createErr.message ?? "").toLowerCase().includes("already")) {
              if (!emailLookup) emailLookup = await buildEmailLookup(adminClient);
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

        if (!userId) {
          throw new Error("Could not determine user id");
        }

        const { error: credErr } = await adminClient
          .from("driver_credentials")
          .upsert({ driver_id: driverId, user_id: userId, status }, { onConflict: "driver_id" });
        if (credErr) throw credErr;

        const { error: roleErr } = await adminClient
          .from("user_roles")
          .upsert({ user_id: userId, role: "driver" }, { onConflict: "user_id,role" });
        if (roleErr) throw roleErr;

        result.success.push({ driverId });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Failed processing driver ${driverId}`, msg);
        result.errors.push({ driverId, error: msg });
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Unhandled error", msg);

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
