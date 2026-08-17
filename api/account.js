import { createHash, randomBytes } from "node:crypto";
import { getAuthenticatedUser, getUserMembership } from "../server/auth.js";
import { sendReceptionEmailVerification } from "../server/email.js";
import {
  isRequestBodyTooLarge,
  isSameOriginRequest,
  setApiHeaders,
} from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";
import {
  validateOrganizationPayload,
  validateOrganizationSettings,
} from "../server/validation.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString());
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function serializeOrganization(row, pendingReceptionEmail = null) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    receptionEmail: row.reception_email,
    pendingReceptionEmail,
    emailVerified: Boolean(row.reception_email_verified_at),
    senderName: row.sender_name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    websiteUrl: row.website_url,
    isActive: row.is_active,
  };
}

async function loadAccount(supabase, userId) {
  const profile = await getUserMembership(supabase, userId);
  if (!profile) {
    return { profile: null, organization: null };
  }

  const [{ data: organization, error: organizationError }, { data: pending, error: pendingError }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, slug, name, reception_email, reception_email_verified_at, sender_name, logo_url, primary_color, website_url, is_active",
        )
        .eq("id", profile.organization_id)
        .single(),
      supabase
        .from("organization_email_verifications")
        .select("email")
        .eq("organization_id", profile.organization_id)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (organizationError) throw organizationError;
  if (pendingError) throw pendingError;

  return {
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
    },
    organization: serializeOrganization(organization, pending?.email || null),
  };
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || "").replace(/\/+$/u, "");
  if (configured) return configured;

  const origin = String(req.headers.origin || "").replace(/\/+$/u, "");
  if (/^https?:\/\/[^/]+$/iu.test(origin)) return origin;

  const forwardedHost = req.headers["x-forwarded-host"];
  const host = String(
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host || "",
  );
  const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(?::\d+)?$/iu.test(host)) {
    throw new Error("Adresse publique de l’application introuvable.");
  }
  return `${protocol === "http" ? "http" : "https"}://${host}`;
}

async function issueVerification(supabase, req, { organization, email, userId }) {
  const { data: recent, error: recentError } = await supabase
    .from("organization_email_verifications")
    .select("created_at")
    .eq("organization_id", organization.id)
    .eq("email", email)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentError) throw recentError;
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
    const error = new Error("Un lien vient déjà d’être envoyé. Patientez une minute.");
    error.status = 429;
    error.code = "VERIFICATION_RATE_LIMITED";
    throw error;
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: insertError } = await supabase
    .from("organization_email_verifications")
    .insert({
      organization_id: organization.id,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: userId,
    });
  if (insertError) throw insertError;

  const verificationUrl = `${getPublicBaseUrl(req)}/verification-email?token=${token}`;
  await sendReceptionEmailVerification({
    organizationName: organization.name,
    recipientEmail: email,
    verificationUrl,
  });
}

export default async function handler(req, res) {
  setApiHeaders(res);

  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." });
  }
  if (req.method !== "GET" && !isSameOriginRequest(req)) {
    return res.status(403).json({ code: "INVALID_ORIGIN", message: "Origine non autorisée." });
  }
  if (req.method !== "GET" && isRequestBodyTooLarge(req, 24 * 1024)) {
    return res.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "Demande trop volumineuse." });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Connectez-vous pour continuer." });
  }

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const account = await loadAccount(supabase, user.id);
      return res.status(200).json(account);
    }

    const body = await readBody(req);

    if (req.method === "POST") {
      const currentMembership = await getUserMembership(supabase, user.id);
      if (currentMembership) {
        return res.status(409).json({
          code: "ACCOUNT_ALREADY_CONFIGURED",
          message: "Votre compte est déjà rattaché à un organisme.",
        });
      }

      const validation = validateOrganizationPayload(body);
      if (!validation.valid) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: validation.errors[0],
          errors: validation.errors,
        });
      }

      const data = validation.data;
      const emailIsConfirmedLogin =
        normalizeEmail(user.email) === data.receptionEmail && Boolean(user.email_confirmed_at);

      const { data: reservedOrganization, error: reservedError } = await supabase
        .from("organizations")
        .select(
          "id, slug, name, reception_email, reception_email_verified_at, sender_name, logo_url, primary_color, website_url, is_active",
        )
        .eq("slug", data.slug)
        .maybeSingle();
      if (reservedError) throw reservedError;

      if (reservedOrganization) {
        const { data: existingAdministrator, error: administratorError } = await supabase
          .from("profiles")
          .select("id")
          .eq("organization_id", reservedOrganization.id)
          .limit(1)
          .maybeSingle();
        if (administratorError) throw administratorError;

        const canClaimReservedOrganization =
          !existingAdministrator &&
          Boolean(user.email_confirmed_at) &&
          normalizeEmail(user.email) === normalizeEmail(reservedOrganization.reception_email) &&
          data.receptionEmail === normalizeEmail(reservedOrganization.reception_email);

        if (!canClaimReservedOrganization) {
          return res.status(409).json({
            code: "SLUG_UNAVAILABLE",
            message: "Cet identifiant est déjà utilisé ou réservé. Choisissez-en un autre.",
          });
        }

        const { data: claimedOrganization, error: claimError } = await supabase
          .from("organizations")
          .update({
            name: data.name,
            reception_email_verified_at: new Date().toISOString(),
            sender_name: data.senderName,
            logo_url: data.logoUrl || reservedOrganization.logo_url,
            primary_color: data.primaryColor,
            website_url: data.websiteUrl || reservedOrganization.website_url,
            is_active: true,
          })
          .eq("id", reservedOrganization.id)
          .select(
            "id, slug, name, reception_email, reception_email_verified_at, sender_name, logo_url, primary_color, website_url, is_active",
          )
          .single();
        if (claimError) throw claimError;

        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          organization_id: claimedOrganization.id,
          full_name: String(user.user_metadata?.full_name || "").slice(0, 160) || null,
          role: "admin",
        });
        if (profileError) throw profileError;

        return res.status(201).json({
          organization: serializeOrganization(claimedOrganization),
          warning: "",
        });
      }

      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .insert({
          slug: data.slug,
          name: data.name,
          reception_email: data.receptionEmail,
          reception_email_verified_at: emailIsConfirmedLogin ? new Date().toISOString() : null,
          sender_name: data.senderName,
          logo_url: data.logoUrl || null,
          primary_color: data.primaryColor,
          website_url: data.websiteUrl || null,
          is_active: emailIsConfirmedLogin,
        })
        .select(
          "id, slug, name, reception_email, reception_email_verified_at, sender_name, logo_url, primary_color, website_url, is_active",
        )
        .single();

      if (organizationError) {
        if (organizationError.code === "23505") {
          return res.status(409).json({
            code: "SLUG_UNAVAILABLE",
            message: "Cet identifiant est déjà utilisé. Choisissez-en un autre.",
          });
        }
        throw organizationError;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        organization_id: organization.id,
        full_name: String(user.user_metadata?.full_name || "").slice(0, 160) || null,
        role: "admin",
      });

      if (profileError) {
        await supabase.from("organizations").delete().eq("id", organization.id);
        throw profileError;
      }

      let warning = "";
      if (!emailIsConfirmedLogin) {
        try {
          await issueVerification(supabase, req, {
            organization,
            email: data.receptionEmail,
            userId: user.id,
          });
        } catch (error) {
          console.error("Initial reception verification failed", error);
          warning =
            "L’organisme est créé, mais le lien de vérification n’a pas pu être envoyé. Réessayez depuis les réglages.";
        }
      }

      return res.status(201).json({
        organization: serializeOrganization(
          organization,
          emailIsConfirmedLogin ? null : data.receptionEmail,
        ),
        warning,
      });
    }

    const membership = await getUserMembership(supabase, user.id);
    if (!membership || membership.role !== "admin") {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "Seul un administrateur de l’organisme peut modifier ces réglages.",
      });
    }

    const { data: currentOrganization, error: currentError } = await supabase
      .from("organizations")
      .select(
        "id, slug, name, reception_email, reception_email_verified_at, sender_name, logo_url, primary_color, website_url, is_active",
      )
      .eq("id", membership.organization_id)
      .single();
    if (currentError) throw currentError;

    if (body?.action === "resend-verification") {
      const { data: pending, error: pendingError } = await supabase
        .from("organization_email_verifications")
        .select("email")
        .eq("organization_id", currentOrganization.id)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (!pending) {
        return res.status(400).json({
          code: "NO_PENDING_EMAIL",
          message: "Aucune adresse n’est en attente de vérification.",
        });
      }
      await issueVerification(supabase, req, {
        organization: currentOrganization,
        email: pending.email,
        userId: user.id,
      });
      return res.status(200).json({ message: "Un nouveau lien de vérification a été envoyé." });
    }

    const validation = validateOrganizationSettings(body, currentOrganization.slug);
    if (!validation.valid) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const data = validation.data;
    const { data: updatedOrganization, error: updateError } = await supabase
      .from("organizations")
      .update({
        name: data.name,
        sender_name: data.senderName,
        logo_url: data.logoUrl || null,
        primary_color: data.primaryColor,
        website_url: data.websiteUrl || null,
      })
      .eq("id", currentOrganization.id)
      .select(
        "id, slug, name, reception_email, reception_email_verified_at, sender_name, logo_url, primary_color, website_url, is_active",
      )
      .single();
    if (updateError) throw updateError;

    let pendingReceptionEmail = null;
    let message = "Les réglages sont enregistrés.";
    if (data.receptionEmail !== normalizeEmail(currentOrganization.reception_email)) {
      const emailIsConfirmedLogin =
        normalizeEmail(user.email) === data.receptionEmail && Boolean(user.email_confirmed_at);

      if (emailIsConfirmedLogin) {
        const { error: emailUpdateError } = await supabase
          .from("organizations")
          .update({
            reception_email: data.receptionEmail,
            reception_email_verified_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", currentOrganization.id);
        if (emailUpdateError) throw emailUpdateError;
        await supabase
          .from("organization_email_verifications")
          .delete()
          .eq("organization_id", currentOrganization.id)
          .is("verified_at", null);
        updatedOrganization.reception_email = data.receptionEmail;
        updatedOrganization.reception_email_verified_at = new Date().toISOString();
        updatedOrganization.is_active = true;
        message = "Les réglages et l’adresse de réception sont enregistrés.";
      } else {
        await issueVerification(supabase, req, {
          organization: updatedOrganization,
          email: data.receptionEmail,
          userId: user.id,
        });
        pendingReceptionEmail = data.receptionEmail;
        message =
          "Les réglages sont enregistrés. Un lien de vérification a été envoyé à la nouvelle adresse.";
      }
    }

    return res.status(200).json({
      organization: serializeOrganization(updatedOrganization, pendingReceptionEmail),
      message,
    });
  } catch (error) {
    console.error("Account API failed", error);
    return res.status(error.status || 500).json({
      code: error.code || "SERVER_ERROR",
      message:
        error.status === 429
          ? error.message
          : "Votre espace ne peut pas être mis à jour pour le moment.",
    });
  }
}
