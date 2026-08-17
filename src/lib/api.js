async function parseJson(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : {};
}

export async function fetchOrganization(slug, signal) {
  const response = await fetch(`/api/organizations?slug=${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await parseJson(response);

  if (!response.ok) {
    throw new Error(body.message || "Cet organisme est indisponible.");
  }

  return body.organization;
}

export async function submitProspect(payload) {
  const response = await fetch("/api/prospects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJson(response);

  if (!response.ok) {
    const error = new Error(
      body.message ||
        "La demande n’a pas pu être transmise. Vérifiez votre connexion puis réessayez.",
    );
    error.code = body.code;
    throw error;
  }

  return body;
}
