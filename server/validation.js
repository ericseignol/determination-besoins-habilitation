const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const PHONE_PATTERN = /^[0-9+().\s/-]{6,40}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;

function cleanString(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanStringArray(value, { maxItems, maxLength }) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, maxItems)
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean);
}

function cleanAnswers(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 40).map((answer) => ({
    questionId: Number.isInteger(answer?.questionId) ? answer.questionId : -1,
    question: cleanString(answer?.question, 600),
    answer: cleanString(answer?.answer, 600),
    affirmation: cleanString(answer?.affirmation, 700),
    recommendation: cleanString(answer?.recommendation, 80),
  }));
}

export function validateOrganizationSlug(value) {
  const slug = cleanString(value, 63).toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : "";
}

function cleanOptionalUrl(value) {
  const url = cleanString(value, 1000);
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function validateOrganizationPayload(body) {
  const errors = [];
  const data = {
    name: cleanString(body?.name, 160),
    slug: validateOrganizationSlug(body?.slug),
    receptionEmail: cleanString(body?.receptionEmail, 254).toLowerCase(),
    senderName: cleanString(body?.senderName, 120),
    logoUrl: cleanOptionalUrl(body?.logoUrl),
    primaryColor: cleanString(body?.primaryColor, 7),
    websiteUrl: cleanOptionalUrl(body?.websiteUrl),
  };

  if (data.name.length < 2) errors.push("Le nom de l’organisme est requis.");
  if (!data.slug) errors.push("L’identifiant du questionnaire est invalide.");
  if (!EMAIL_PATTERN.test(data.receptionEmail)) {
    errors.push("L’adresse de réception est invalide.");
  }
  if (data.senderName.length < 2) errors.push("Le nom d’expéditeur est requis.");
  if (!COLOR_PATTERN.test(data.primaryColor)) errors.push("La couleur principale est invalide.");
  if (body?.logoUrl && !data.logoUrl) errors.push("L’adresse du logo est invalide.");
  if (body?.websiteUrl && !data.websiteUrl) errors.push("L’adresse du site internet est invalide.");

  return { valid: errors.length === 0, errors, data };
}

export function validateOrganizationSettings(body, currentSlug) {
  return validateOrganizationPayload({
    ...body,
    slug: currentSlug,
  });
}

export function validateProspectPayload(body) {
  const errors = [];
  const submissionId = cleanString(body?.submissionId, 36);
  const organizationSlug = validateOrganizationSlug(body?.organizationSlug);
  const contact = {
    name: cleanString(body?.contact?.name, 120),
    company: cleanString(body?.contact?.company, 160),
    email: cleanString(body?.contact?.email, 254).toLowerCase(),
    phone: cleanString(body?.contact?.phone, 40),
  };
  const employeeNames = cleanStringArray(body?.employeeNames, {
    maxItems: 50,
    maxLength: 160,
  });
  const recommendations = cleanStringArray(body?.recommendations, {
    maxItems: 30,
    maxLength: 80,
  });
  const affirmations = cleanStringArray(body?.affirmations, {
    maxItems: 40,
    maxLength: 700,
  });
  const answers = cleanAnswers(body?.answers);
  const consent = body?.consent === true;
  const formStartedAt = Number(body?.formStartedAt);

  if (!UUID_PATTERN.test(submissionId)) errors.push("Identifiant de soumission invalide.");
  if (!organizationSlug) errors.push("Organisme invalide.");
  if (contact.name.length < 2) errors.push("Le nom est requis.");
  if (contact.company.length < 2) errors.push("L’entreprise est requise.");
  if (!EMAIL_PATTERN.test(contact.email)) errors.push("L’adresse e-mail est invalide.");
  if (!PHONE_PATTERN.test(contact.phone)) errors.push("Le numéro de téléphone est invalide.");
  if (!employeeNames.length) errors.push("Au moins un salarié doit être indiqué.");
  if (!answers.length || answers.some((answer) => answer.questionId < 0 || !answer.answer)) {
    errors.push("Les réponses au questionnaire sont incomplètes.");
  }
  if (!consent) errors.push("Le consentement est requis.");
  if (!Number.isFinite(formStartedAt)) errors.push("Horodatage du formulaire invalide.");

  const now = Date.now();
  const elapsedMilliseconds = now - formStartedAt;
  if (Number.isFinite(formStartedAt) && elapsedMilliseconds < 1500) {
    errors.push("Le formulaire a été envoyé trop rapidement.");
  }
  if (
    Number.isFinite(formStartedAt) &&
    (elapsedMilliseconds > 2 * 60 * 60 * 1000 || elapsedMilliseconds < -5 * 60 * 1000)
  ) {
    errors.push("La session du formulaire a expiré.");
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      submissionId,
      organizationSlug,
      contact,
      employeeNames,
      recommendations: [...new Set(recommendations)],
      affirmations,
      answers,
      consent,
      formStartedAt,
      durationSeconds: Math.max(0, Math.round(elapsedMilliseconds / 1000)),
    },
  };
}
