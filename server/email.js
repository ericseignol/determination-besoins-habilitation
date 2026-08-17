function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeSubjectPart(value) {
  return String(value).replace(/[\r\n]+/gu, " ").trim().slice(0, 120);
}

function listHtml(items) {
  if (!items?.length) {
    return "<p style=\"color:#68777d\">Aucun élément.</p>";
  }

  return `<ul style="padding-left:20px">${items
    .map((item) => `<li style="margin:0 0 7px">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function listText(items) {
  return items?.length ? items.map((item) => `- ${item}`).join("\n") : "- Aucun élément";
}

export async function sendBrevoEmail({ organization, prospect, submission }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = safeSubjectPart(
    organization.sender_name ||
      process.env.BREVO_SENDER_NAME ||
      "Qualification Habilitations",
  );

  if (!apiKey || !senderEmail) {
    throw new Error("Configuration Brevo incomplète.");
  }

  const recommendations = submission.recommendations || [];
  const affirmations = submission.affirmations || [];
  const employees = prospect.employee_names || [];
  const subject = `Nouvelle demande habilitation — ${safeSubjectPart(prospect.company_name)}`;

  const htmlContent = `
    <!doctype html>
    <html lang="fr">
      <body style="margin:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#172229">
        <div style="max-width:680px;margin:0 auto;padding:28px 16px">
          <div style="background:#ffffff;border:1px solid #dce3e5;border-radius:16px;overflow:hidden">
            <div style="padding:24px 28px;background:${escapeHtml(
              organization.primary_color || "#096b72",
            )};color:#ffffff">
              <p style="margin:0 0 7px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Nouvelle demande</p>
              <h1 style="margin:0;font-size:24px">Questionnaire d’habilitation électrique</h1>
            </div>
            <div style="padding:28px">
              <h2 style="margin:0 0 16px;font-size:18px">Contact</h2>
              <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:7px 12px 7px 0;color:#68777d">Nom</td><td style="padding:7px 0;font-weight:700">${escapeHtml(
                  prospect.contact_name,
                )}</td></tr>
                <tr><td style="padding:7px 12px 7px 0;color:#68777d">Entreprise</td><td style="padding:7px 0;font-weight:700">${escapeHtml(
                  prospect.company_name,
                )}</td></tr>
                <tr><td style="padding:7px 12px 7px 0;color:#68777d">E-mail</td><td style="padding:7px 0"><a href="mailto:${escapeHtml(
                  prospect.email,
                )}">${escapeHtml(prospect.email)}</a></td></tr>
                <tr><td style="padding:7px 12px 7px 0;color:#68777d">Téléphone</td><td style="padding:7px 0">${escapeHtml(
                  prospect.phone,
                )}</td></tr>
              </table>
              <hr style="margin:24px 0;border:0;border-top:1px solid #e3e8e9">
              <h2 style="margin:0 0 10px;font-size:18px">Salarié(s) concerné(s)</h2>
              ${listHtml(employees)}
              <h2 style="margin:22px 0 10px;font-size:18px">Indices identifiés</h2>
              ${listHtml(recommendations)}
              <h2 style="margin:22px 0 10px;font-size:18px">Synthèse des réponses</h2>
              ${listHtml(affirmations)}
              <p style="margin:26px 0 0;padding:14px;border-radius:10px;background:#f4f7f6;color:#526168;font-size:13px">
                Répondez directement à cet e-mail : la réponse sera adressée au prospect.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = [
    "Nouvelle demande de détermination des besoins en habilitation électrique",
    "",
    `Nom : ${prospect.contact_name}`,
    `Entreprise : ${prospect.company_name}`,
    `E-mail : ${prospect.email}`,
    `Téléphone : ${prospect.phone}`,
    "",
    "Salarié(s) concerné(s) :",
    listText(employees),
    "",
    "Indices identifiés :",
    listText(recommendations),
    "",
    "Synthèse des réponses :",
    listText(affirmations),
  ].join("\n");

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
        name: senderName,
      },
      to: [
        {
          email: organization.reception_email,
          name: organization.name,
        },
      ],
      replyTo: {
        email: prospect.email,
        name: prospect.contact_name,
      },
      subject,
      htmlContent,
      textContent,
      tags: ["questionnaire-habilitation"],
    }),
  });

  const responseText = await response.text();
  let responseBody = {};
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = {};
  }

  if (!response.ok) {
    const error = new Error(`Brevo a répondu avec le statut ${response.status}.`);
    error.providerDetails = responseText.slice(0, 1000);
    throw error;
  }

  return {
    messageId: responseBody.messageId || null,
  };
}

export async function sendReceptionEmailVerification({
  organizationName,
  recipientEmail,
  verificationUrl,
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Qualification Habilitations";

  if (!apiKey || !senderEmail) {
    throw new Error("Configuration Brevo incomplète.");
  }

  const safeOrganizationName = escapeHtml(organizationName);
  const safeVerificationUrl = escapeHtml(verificationUrl);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: recipientEmail, name: organizationName }],
      subject: `Confirmez l’adresse de réception — ${safeSubjectPart(organizationName)}`,
      htmlContent: `
        <!doctype html>
        <html lang="fr">
          <body style="margin:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#172229">
            <div style="max-width:620px;margin:0 auto;padding:30px 16px">
              <div style="padding:30px;border:1px solid #dce3e5;border-radius:16px;background:#ffffff">
                <h1 style="margin:0 0 16px;font-size:24px">Confirmez votre adresse de réception</h1>
                <p style="line-height:1.65">
                  Une personne administrant ${safeOrganizationName} souhaite utiliser cette adresse
                  pour recevoir les demandes du questionnaire d’habilitation électrique.
                </p>
                <p style="margin:25px 0">
                  <a href="${safeVerificationUrl}"
                     style="display:inline-block;padding:13px 20px;border-radius:10px;color:#ffffff;background:#096b72;text-decoration:none;font-weight:bold">
                    Confirmer cette adresse
                  </a>
                </p>
                <p style="color:#68777d;font-size:13px;line-height:1.55">
                  Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Le lien expire
                  automatiquement.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      textContent: [
        `Confirmez l’adresse de réception de ${organizationName}.`,
        "",
        verificationUrl,
        "",
        "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
      ].join("\n"),
      tags: ["verification-adresse-reception"],
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(`Brevo a répondu avec le statut ${response.status}.`);
    error.providerDetails = responseText.slice(0, 1000);
    throw error;
  }
}
