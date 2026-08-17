import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "../server/supabase.js";

function isAuthorized(request) {
  const expectedToken = process.env.KEEPALIVE_TOKEN;
  const authorization = request.headers.authorization || "";
  const providedToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!expectedToken || !providedToken) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(providedToken);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ ok: false });
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from("organizations")
      .select("id")
      .limit(1);

    if (error) {
      return response.status(503).json({ ok: false });
    }

    return response.status(204).end();
  } catch {
    return response.status(503).json({ ok: false });
  }
}
