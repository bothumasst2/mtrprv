import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { athleteIds } = await req.json();

  if (!Array.isArray(athleteIds) || athleteIds.length === 0) {
    return NextResponse.json({ error: "Invalid athleteIds" }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete related data first (cascade should handle it, but be explicit)
  await adminClient.from("training_log").delete().in("user_id", athleteIds);
  await adminClient.from("training_assignments").delete().in("user_id", athleteIds);
  await adminClient.from("users").delete().in("id", athleteIds);

  // Delete from auth.users using admin API
  const errors: string[] = [];
  for (const id of athleteIds) {
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) errors.push(`${id}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Some auth users could not be deleted", details: errors },
      { status: 207 },
    );
  }

  return NextResponse.json({ success: true });
}
