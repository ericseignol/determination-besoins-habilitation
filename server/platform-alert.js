const INTERNAL_EMAILS = new Set([
  "eric.seignol@gmail.com",
  "formidalpes@gmail.com",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanHeaderValue(value) {
  return String(value ?? "").replace(/[\r\n]+/gu, " ").trim().slice(0, 110);
}

/**
 * Alerte interne envoyée uniquement après la création effective de l'espace
 * organisme. Ne jamais bloquer l'onboarding en cas d'échec de la messagerie.
 */
export async function sendPlatformSignupAlert({ organization, userEmail }) {
  const loginEmail = String(userEmail ?? "").trim().toLowerCase();
  if (
    !organization ||
    !loginEmail ||
    INTERNAL_EMAILS.has(loginEmail) ||
    organization.slug === "formid-alpes"
  ) {
    return { skipped: true };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const recipientEmail =
    process.env.PLATFORM_ALERT_EMAIL?.trim() || "formidalpes@gmail.com";

  if (!apiKey || !senderEmail) {
    throw new Error("Configuration Brevo absente pour l'alerte d'inscription.");
  }

  const organizationName = cleanHeaderValue(organization.name);
  const receptionEmail = String(organization.reception_email || "").trim();
  const createdAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const textContent = [
    "Nouvel espace organisme créé sur HabiliCible",
    "",
    `Organisme : ${organizationName}`,
    `Identifiant : ${organization.slug}`,
    `Compte : ${loginEmail}`,
    `E-mail de réception : ${receptionEmail}`,
    `Réception vérifiée : ${organization.reception_email_verified_at ? "oui" : "en attente"}`,
    `Date (Paris) : ${createdAt}`,
    "",
    "Cette alerte concerne un espace organisme créé, pas une simple visite.",
    "Connectez-vous à HabiliCible pour examiner le nouveau compte.",
  ].join("\n");

  const htmlContent = `<html lang="fr"><body style="font-family:Arial,sans-serif;color:#172229">
    <h2>Nouvelle inscription HabiliCible</h2>
    <p>Un espace organisme vient d'être créé.</p>
    <p><strong>Organisme :</strong> ${escapeHtml(organizationName)}<br>
    <strong>Identifiant :</strong> ${escapeHtml(organization.slug)}<br>
    <strong>Compte :</strong> ${escapeHtml(loginEmail)}<br>
    <strong>E-mail de réception :</strong> ${escapeHtml(receptionEmail)}<br>
    <strong>Réception vérifiée :</strong> ${organization.reception_email_verified_at ? "oui" : "en attente"}<br>
    <strong>Date (Paris) :</strong> ${escapeHtml(createdAt)}</p>
    <p style="color:#64748b">Inscription finalisée : cette alerte ne compte pas les simples visites.</p>
  </body></html>`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: process.env.BREVO_SENDER_NAME || "HabiliCible",
      },
      to: [{ email: recipientEmail, name: "Formid'Alpes" }],
      subject: `[HabiliCible] Nouvel organisme inscrit — ${organizationName}`,
      htmlContent,
      textContent,
      tags: ["habilicible-inscription"],
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Alerte HabiliCible non envoyée (Brevo HTTP ${response.status}).`);
  }
  return { skipped: false };
}
