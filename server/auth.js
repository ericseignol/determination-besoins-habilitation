import { getSupabaseAdmin } from "./supabase.js";

export function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() || "";
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getUserMembership(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
