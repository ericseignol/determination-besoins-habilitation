import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPlatformSignupAlert } from "../server/platform-alert.js";

const organization = {
  slug: "nouvel-organisme",
  name: "Centre Test <Alpha>",
  reception_email: "contact@centre-exemple.fr",
  reception_email_verified_at: "2026-10-12T10:00:00Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("alerte d'inscription HabiliCible", () => {
  it("ignore nos comptes de test internes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendPlatformSignupAlert({
      userEmail: "eric.seignol@gmail.com",
      organization,
    });
    expect(result).toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("notifie Formid'Alpes sans exposer les secrets au client", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "notifications@formid-alpes.fr");
    vi.stubEnv("PLATFORM_ALERT_EMAIL", "formidalpes@gmail.com");
    const fetchMock = vi.fn(async () => ({ ok: true, status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPlatformSignupAlert({
      userEmail: "contact@nouveau-client.fr",
      organization,
    });
    expect(result).toEqual({ skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const payload = JSON.parse(options.body);
    expect(payload.to[0].email).toBe("formidalpes@gmail.com");
    expect(payload.tags).toContain("habilicible-inscription");
    expect(payload.textContent).toContain("contact@nouveau-client.fr");
    expect(payload.htmlContent).toContain("Centre Test &lt;Alpha&gt;");
    expect(payload.htmlContent).not.toContain("Centre Test <Alpha>");
  });

  it("remonte une erreur Brevo qui sera absorbee par le handler account", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "notifications@formid-alpes.fr");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 })));
    await expect(
      sendPlatformSignupAlert({ userEmail: "contact@nouveau-client.fr", organization }),
    ).rejects.toThrow("Brevo HTTP 401");
  });
});
