import { createHash } from "node:crypto";
import { setApiHeaders } from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";

export default async function handler(req, res) {
  setApiHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." });
  }

  const token = String(req.query?.token || "");
  if (!/^[0-9a-f]{64}$/iu.test(token)) {
    return res.status(400).json({
      code: "INVALID_TOKEN",
      message: "Ce lien de vérification est invalide.",
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: verification, error: verificationError } = await supabase
      .from("organization_email_verifications")
      .select("id, organization_id, email, expires_at, verified_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (verificationError) throw verificationError;

    if (
      !verification ||
      verification.verified_at ||
      new Date(verification.expires_at).getTime() < Date.now()
    ) {
      return res.status(400).json({
        code: "TOKEN_EXPIRED",
        message: "Ce lien est expiré ou a déjà été utilisé.",
      });
    }

    const verifiedAt = new Date().toISOString();
    const { error: organizationError } = await supabase
      .from("organizations")
      .update({
        reception_email: verification.email,
        reception_email_verified_at: verifiedAt,
        is_active: true,
      })
      .eq("id", verification.organization_id);
    if (organizationError) throw organizationError;

    const { error: verificationUpdateError } = await supabase
      .from("organization_email_verifications")
      .update({ verified_at: verifiedAt })
      .eq("id", verification.id);
    if (verificationUpdateError) throw verificationUpdateError;

    await supabase
      .from("organization_email_verifications")
      .delete()
      .eq("organization_id", verification.organization_id)
      .is("verified_at", null);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Reception email verification failed", error);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Cette adresse ne peut pas être vérifiée pour le moment.",
    });
  }
}
