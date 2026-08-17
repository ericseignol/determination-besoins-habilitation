async function parseJson(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : {};
}

async function authenticatedRequest(path, session, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const body = await parseJson(response);

  if (!response.ok) {
    const error = new Error(body.message || "L’opération n’a pas pu être effectuée.");
    error.code = body.code;
    error.status = response.status;
    throw error;
  }

  return body;
}

export function fetchAccount(session) {
  return authenticatedRequest("/api/account", session);
}

export function createOrganization(session, payload) {
  return authenticatedRequest("/api/account", session, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrganization(session, payload) {
  return authenticatedRequest("/api/account", session, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function resendReceptionVerification(session) {
  return authenticatedRequest("/api/account", session, {
    method: "PATCH",
    body: JSON.stringify({ action: "resend-verification" }),
  });
}

export function fetchAdminProspects(session) {
  return authenticatedRequest("/api/admin-prospects", session);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : "");
    });
    reader.addEventListener("error", () => reject(new Error("Le fichier ne peut pas être lu.")));
    reader.readAsDataURL(file);
  });
}

export async function uploadOrganizationLogo(session, file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choisissez une image PNG, JPG ou WebP.");
  }
  if (file.size > 1_500_000) {
    throw new Error("Le logo ne doit pas dépasser 1,5 Mo.");
  }

  return authenticatedRequest("/api/logo", session, {
    method: "POST",
    body: JSON.stringify({
      contentType: file.type,
      base64: await readFileAsBase64(file),
    }),
  });
}

export function deleteAdminProspect(session, prospectId) {
  return authenticatedRequest("/api/admin-prospects", session, {
    method: "DELETE",
    body: JSON.stringify({ prospectId }),
  });
}

export async function verifyReceptionEmail(token) {
  const response = await fetch(`/api/verify-reception-email?token=${encodeURIComponent(token)}`, {
    headers: { Accept: "application/json" },
  });
  const body = await parseJson(response);

  if (!response.ok) {
    throw new Error(body.message || "Ce lien de vérification n’est pas valide.");
  }

  return body;
}
