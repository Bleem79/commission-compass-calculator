import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) throw new Error("Unauthorized");

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Admin access required");

  return adminClient;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = await verifyAdmin(req);
    const body = await req.json();
    const { action = "create" } = body;

    // LIST USERS - fetch portal users with email/username from auth
    if (action === "list") {
      const { data: roles, error } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["user", "advanced"]);

      if (error) throw new Error(error.message);

      // Fetch auth user details for each
      const users = [];
      for (const r of roles || []) {
        const { data: { user } } = await adminClient.auth.admin.getUserById(r.user_id);
        users.push({
          id: r.user_id,
          email: user?.email || "",
          username: user?.user_metadata?.username || "",
          role: r.role,
          created_at: user?.created_at || "",
          banned: !!user?.banned_until && new Date(user.banned_until) > new Date(),
        });
      }

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CHANGE ROLE
    if (action === "change_role") {
      const { user_id, new_role } = body;
      if (!user_id || !new_role) throw new Error("user_id and new_role required");
      if (!["user", "advanced"].includes(new_role)) throw new Error("Invalid role");

      const { error } = await adminClient
        .from("user_roles")
        .update({ role: new_role })
        .eq("user_id", user_id);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TOGGLE BAN (enable/disable)
    if (action === "toggle_status") {
      const { user_id, disable } = body;
      if (!user_id) throw new Error("user_id required");

      if (disable) {
        // Ban the user (set banned_until far future)
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h", // ~100 years
        });
        if (error) throw new Error(error.message);
      } else {
        // Unban
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });
        if (error) throw new Error(error.message);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER (default action)
    const { email, password, username, role } = body;

    if (!email || !password || !username || !role) {
      throw new Error("All fields are required");
    }

    const validRoles = ["user", "advanced"];
    if (!validRoles.includes(role)) {
      throw new Error("Invalid role. Must be 'user' or 'advanced'");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (createError) throw new Error(createError.message);

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      throw new Error("User created but role assignment failed: " + roleError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user.id, email: newUser.user.email, username, role },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const status = err.message === "Unauthorized" || err.message === "Missing authorization" ? 401
      : err.message === "Admin access required" ? 403 : 400;
    return new Response(
      JSON.stringify({ error: err.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
