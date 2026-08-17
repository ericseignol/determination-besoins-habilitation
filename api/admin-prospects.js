import { getAuthenticatedUser, getUserMembership } from "../server/auth.js";
import {
  isRequestBodyTooLarge,
  isSameOriginRequest,
  setApiHeaders,
} from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";

export default async function handler(req, res) {
  setApiHeaders(res);

  if (!["GET", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." });
  }
  if (req.method === "DELETE" && !isSameOriginRequest(req)) {
    return res.status(403).json({ code: "INVALID_ORIGIN", message: "Origine non autorisée." });
  }
  if (req.method === "DELETE" && isRequestBodyTooLarge(req, 8 * 1024)) {
    return res.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "Demande trop volumineuse." });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Connectez-vous pour continuer." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const membership = await getUserMembership(supabase, user.id);
    if (!membership) {
      return res.status(403).json({
        code: "ACCOUNT_NOT_CONFIGURED",
        message: "Votre compte n’est rattaché à aucun organisme.",
      });
    }

    if (req.method === "DELETE") {
      const body =
        req.body && typeof req.body === "object"
          ? req.body
          : JSON.parse(String(req.body || "{}"));
      const prospectId = String(body.prospectId || "");
      if (!/^[0-9a-f-]{36}$/iu.test(prospectId)) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "La demande à supprimer est invalide.",
        });
      }

      const { error: deleteError, count } = await supabase
        .from("prospects")
        .delete({ count: "exact" })
        .eq("id", prospectId)
        .eq("organization_id", membership.organization_id);
      if (deleteError) throw deleteError;
      if (!count) {
        return res.status(404).json({
          code: "PROSPECT_NOT_FOUND",
          message: "Cette demande n’existe pas ou n’appartient pas à votre organisme.",
        });
      }
      return res.status(200).json({ deleted: true });
    }

    const { data, error } = await supabase
      .from("prospects")
      .select(
        "id, contact_name, company_name, email, phone, employee_names, recommended_habilitations, status, created_at",
      )
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw error;

    return res.status(200).json({
      prospects: data.map((prospect) => ({
        id: prospect.id,
        contactName: prospect.contact_name,
        companyName: prospect.company_name,
        email: prospect.email,
        phone: prospect.phone,
        employeeNames: prospect.employee_names,
        recommendations: prospect.recommended_habilitations,
        status: prospect.status,
        createdAt: prospect.created_at,
      })),
    });
  } catch (error) {
    console.error("Admin prospects lookup failed", error);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Les prospects ne peuvent pas être chargés pour le moment.",
    });
  }
}
