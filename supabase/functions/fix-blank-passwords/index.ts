// Supabase Edge Function: fix-blank-passwords
// Generates a new 6-digit password for every driver whose password_text is blank.
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

function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("fix-blank-passwords: missing env vars");
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

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json(401, { error: "Unauthorized" });
    }

    const callerId = userData.user.id;

    // Admin only
    const { data: callerRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("fix-blank-passwords: role check failed", roleError);
      return json(500, { error: "Role check failed" });
    }

    if (!callerRole) {
      return json(403, { error: "Forbidden: admin access required" });
    }

    // Fetch all credentials with blank password_text (paginated)
    const blankCreds: Array<{ id: string; driver_id: string; user_id: string | null }> = [];
    let from = 0;
    const PAGE = 1000;
    for (;;) {
      const { data, error } = await adminClient
        .from("driver_credentials")
        .select("id, driver_id, user_id")
        .or("password_text.is.null,password_text.eq.")
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("fix-blank-passwords: fetch failed", error);
        return json(500, { error: "Failed to fetch driver credentials" });
      }
      if (!data || data.length === 0) break;
      blankCreds.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    if (blankCreds.length === 0) {
      return json(200, { success: true, fixed: [], message: "No blank passwords found" });
    }

    console.log(`fix-blank-passwords: fixing ${blankCreds.length} drivers (caller=${callerId})`);

    const fixed: Array<{ driverId: string; password: string }> = [];
    const errors: Array<{ driverId: string; error: string }> = [];

    for (const cred of blankCreds) {
      const newPassword = generatePassword();
      try {
        let userId = cred.user_id;

        if (!userId) {
          // Try to find or create the auth user
          const email = `${cred.driver_id.toLowerCase()}@driver.temp`;
          let page = 1;
          const perPage = 1000;
          while (!userId) {
            const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
            if (listError) throw listError;
            const found = listData.users.find((u) => u.email?.toLowerCase() === email);
            if (found) {
              userId = found.id;
              break;
            }
            if (!listData.nextPage || listData.nextPage <= page) break;
            page = listData.nextPage;
          }

          if (!userId) {
            const { data: created, error: createError } = await adminClient.auth.admin.createUser({
              email,
              password: newPassword,
              email_confirm: true,
            });
            if (createError) throw createError;
            userId = created.user.id;
          }
        }

        if (userId) {
          const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: newPassword,
          });
          if (updateError) throw updateError;
        }

        const { error: credUpdateError } = await adminClient
          .from("driver_credentials")
          .update({ user_id: userId, password_text: newPassword })
          .eq("id", cred.id);
        if (credUpdateError) throw credUpdateError;

        fixed.push({ driverId: cred.driver_id, password: newPassword });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`fix-blank-passwords: failed for driver=${cred.driver_id}`, msg);
        errors.push({ driverId: cred.driver_id, error: msg });
      }
    }

    console.log(`fix-blank-passwords: done fixed=${fixed.length} errors=${errors.length}`);
    return json(200, { success: true, fixed, errors });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("fix-blank-passwords: unhandled error", msg);
    return json(500, { error: msg });
  }
});
