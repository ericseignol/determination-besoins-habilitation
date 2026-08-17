import { setApiHeaders } from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";

async function checkSupabase() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("organizations").select("id").limit(1);
  if (error) throw error;
}

async function checkBrevo() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("Brevo non configuré.");

  const response = await fetch("https://api.brevo.com/v3/account", {
    headers: {
      Accept: "application/json",
      "api-key": apiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`Brevo indisponible (${response.status}).`);
  }
}

export default async function handler(req, res) {
  setApiHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }

  const results = await Promise.allSettled([checkSupabase(), checkBrevo()]);
  const services = {
    database: results[0].status === "fulfilled",
    email: results[1].status === "fulfilled",
  };
  const ok = services.database && services.email;

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(ok ? 200 : 503).json({ ok, services });
}
