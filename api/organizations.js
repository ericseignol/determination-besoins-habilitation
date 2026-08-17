import { setApiHeaders } from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";
import { validateOrganizationSlug } from "../server/validation.js";

function publicOrganization(row) {
  return {
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url,
    primaryColor: /^#[0-9a-f]{6}$/iu.test(row.primary_color || "")
      ? row.primary_color
      : "#096b72",
    websiteUrl: row.website_url,
  };
}

export default async function handler(req, res) {
  setApiHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." });
  }

  const slug = validateOrganizationSlug(req.query?.slug);
  if (!slug) {
    return res.status(400).json({ code: "INVALID_SLUG", message: "Organisme invalide." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("organizations")
      .select("slug, name, logo_url, primary_color, website_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res
        .status(404)
        .json({ code: "ORGANIZATION_NOT_FOUND", message: "Cet organisme est indisponible." });
    }

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ organization: publicOrganization(data) });
  } catch (error) {
    console.error("Organization lookup failed", error);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Le questionnaire ne peut pas être chargé pour le moment.",
    });
  }
}
