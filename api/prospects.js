import { sendBrevoEmail } from "../server/email.js";
import {
  getClientIp,
  getRateLimitSettings,
  hashClientIp,
  isRequestBodyTooLarge,
  isSameOriginRequest,
  safeRequestMetadata,
  setApiHeaders,
} from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";
import { validateProspectPayload } from "../server/validation.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString());
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function loadOrganization(supabase, slug) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, slug, name, reception_email, reception_email_verified_at, sender_name, primary_color, is_active",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .not("reception_email_verified_at", "is", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function loadExistingSubmission(supabase, organizationId, publicId) {
  const { data, error } = await supabase
    .from("questionnaire_submissions")
    .select(
      "id, prospect_id, public_id, recommendations, affirmations, answers, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function loadProspect(supabase, prospectId) {
  const { data, error } = await supabase
    .from("prospects")
    .select(
      "id, contact_name, company_name, email, phone, employee_names, recommended_habilitations",
    )
    .eq("id", prospectId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function loadLastEmailAttempt(supabase, submissionId) {
  const { data, error } = await supabase
    .from("email_logs")
    .select("id, status, attempt_number, created_at")
    .eq("submission_id", submissionId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createEmailAttempt(
  supabase,
  { organizationId, prospectId, submissionId, recipientEmail, attemptNumber },
) {
  const { data, error } = await supabase
    .from("email_logs")
    .insert({
      organization_id: organizationId,
      prospect_id: prospectId,
      submission_id: submissionId,
      provider: "brevo",
      recipient_email: recipientEmail,
      status: "pending",
      attempt_number: attemptNumber,
    })
    .select("id, status, attempt_number, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deliverEmail(supabase, { log, organization, prospect, submission }) {
  try {
    const { messageId } = await sendBrevoEmail({
      organization,
      prospect,
      submission,
    });

    const { error: updateError } = await supabase
      .from("email_logs")
      .update({
        status: "sent",
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", log.id);

    if (updateError) {
      console.error("Email sent but log update failed", updateError);
    }

    return;
  } catch (error) {
    const logMessage = `${error.message}${
      error.providerDetails ? ` — ${error.providerDetails}` : ""
    }`.slice(0, 2000);

    const { error: updateError } = await supabase
      .from("email_logs")
      .update({
        status: "failed",
        error_message: logMessage,
      })
      .eq("id", log.id);

    if (updateError) {
      console.error("Email failure log update failed", updateError);
    }

    throw error;
  }
}

async function retryExistingSubmission(supabase, organization, submission) {
  const [prospect, lastAttempt] = await Promise.all([
    loadProspect(supabase, submission.prospect_id),
    loadLastEmailAttempt(supabase, submission.id),
  ]);

  if (lastAttempt?.status === "sent") {
    return { status: 200, body: { ok: true, submissionId: submission.public_id } };
  }

  const pendingAge = lastAttempt
    ? Date.now() - new Date(lastAttempt.created_at).getTime()
    : Number.POSITIVE_INFINITY;

  if (lastAttempt?.status === "pending" && pendingAge < 60_000) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "SUBMISSION_IN_PROGRESS",
        message: "La demande est déjà en cours de transmission. Réessayez dans un instant.",
      },
    };
  }

  const log = await createEmailAttempt(supabase, {
    organizationId: organization.id,
    prospectId: prospect.id,
    submissionId: submission.id,
    recipientEmail: organization.reception_email,
    attemptNumber: (lastAttempt?.attempt_number || 0) + 1,
  });

  try {
    await deliverEmail(supabase, {
      log,
      organization,
      prospect,
      submission,
    });
    return { status: 200, body: { ok: true, submissionId: submission.public_id } };
  } catch (error) {
    console.error("Brevo retry failed", error);
    return {
      status: 502,
      body: {
        ok: false,
        code: "EMAIL_DELIVERY_FAILED",
        message: "La notification n’a pas pu être envoyée. Merci de réessayer.",
      },
    };
  }
}

async function cleanupIncompleteSubmission(supabase, { prospectId, submissionId }) {
  if (submissionId) {
    await supabase.from("questionnaire_submissions").delete().eq("id", submissionId);
  }
  if (prospectId) {
    await supabase.from("prospects").delete().eq("id", prospectId);
  }
}

export default async function handler(req, res) {
  setApiHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." });
  }

  if (isRequestBodyTooLarge(req)) {
    return res
      .status(413)
      .json({ code: "PAYLOAD_TOO_LARGE", message: "La demande est trop volumineuse." });
  }

  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ code: "INVALID_ORIGIN", message: "Origine non autorisée." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ code: "INVALID_JSON", message: "Requête invalide." });
  }

  if (typeof body?.website === "string" && body.website.trim()) {
    return res.status(201).json({ ok: true });
  }

  const validation = validateProspectPayload(body);
  if (!validation.valid) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: validation.errors[0],
      errors: validation.errors,
    });
  }

  const payload = validation.data;
  let prospectId;
  let submissionDatabaseId;

  try {
    const supabase = getSupabaseAdmin();
    const organization = await loadOrganization(supabase, payload.organizationSlug);

    if (!organization) {
      return res
        .status(404)
        .json({ code: "ORGANIZATION_NOT_FOUND", message: "Cet organisme est indisponible." });
    }

    const existingSubmission = await loadExistingSubmission(
      supabase,
      organization.id,
      payload.submissionId,
    );
    if (existingSubmission) {
      const retryResult = await retryExistingSubmission(
        supabase,
        organization,
        existingSubmission,
      );
      return res.status(retryResult.status).json(retryResult.body);
    }

    const ipHash = hashClientIp(getClientIp(req));
    const { maximum, windowMinutes } = getRateLimitSettings();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await supabase
      .from("questionnaire_submissions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);

    if (rateLimitError) {
      throw rateLimitError;
    }

    if ((count || 0) >= maximum) {
      res.setHeader("Retry-After", String(windowMinutes * 60));
      return res.status(429).json({
        code: "RATE_LIMITED",
        message: "Trop de demandes ont été envoyées. Merci de réessayer plus tard.",
      });
    }

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .insert({
        organization_id: organization.id,
        contact_name: payload.contact.name,
        company_name: payload.contact.company,
        email: payload.contact.email,
        phone: payload.contact.phone,
        employee_names: payload.employeeNames,
        recommended_habilitations: payload.recommendations,
        consent_at: new Date().toISOString(),
      })
      .select(
        "id, contact_name, company_name, email, phone, employee_names, recommended_habilitations",
      )
      .single();

    if (prospectError) {
      throw prospectError;
    }
    prospectId = prospect.id;

    const { data: submission, error: submissionError } = await supabase
      .from("questionnaire_submissions")
      .insert({
        public_id: payload.submissionId,
        organization_id: organization.id,
        prospect_id: prospect.id,
        answers: payload.answers,
        affirmations: payload.affirmations,
        recommendations: payload.recommendations,
        ip_hash: ipHash,
        duration_seconds: payload.durationSeconds,
        request_metadata: safeRequestMetadata(req),
      })
      .select(
        "id, prospect_id, public_id, recommendations, affirmations, answers, created_at",
      )
      .single();

    if (submissionError) {
      await cleanupIncompleteSubmission(supabase, { prospectId });
      throw submissionError;
    }
    submissionDatabaseId = submission.id;

    let log;
    try {
      log = await createEmailAttempt(supabase, {
        organizationId: organization.id,
        prospectId: prospect.id,
        submissionId: submission.id,
        recipientEmail: organization.reception_email,
        attemptNumber: 1,
      });
    } catch (error) {
      await cleanupIncompleteSubmission(supabase, {
        prospectId,
        submissionId: submissionDatabaseId,
      });
      throw error;
    }

    try {
      await deliverEmail(supabase, {
        log,
        organization,
        prospect,
        submission,
      });
    } catch (error) {
      console.error("Brevo delivery failed", error);
      return res.status(502).json({
        ok: false,
        code: "EMAIL_DELIVERY_FAILED",
        message: "La notification n’a pas pu être envoyée. Merci de réessayer.",
      });
    }

    return res.status(201).json({
      ok: true,
      submissionId: payload.submissionId,
    });
  } catch (error) {
    console.error("Prospect submission failed", error);
    return res.status(500).json({
      ok: false,
      code: "SERVER_ERROR",
      message: "La demande n’a pas pu être traitée pour le moment.",
    });
  }
}
