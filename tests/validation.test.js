import { describe, expect, it } from "vitest";
import {
  validateOrganizationPayload,
  validateProspectPayload,
} from "../server/validation.js";

function validPayload(overrides = {}) {
  return {
    submissionId: "2e5d0ab6-2df8-4ddb-93ea-f6e10494b47c",
    organizationSlug: "asfor",
    contact: {
      name: "Marie Dupont",
      company: "Entreprise Exemple",
      email: "marie@example.com",
      phone: "+33 6 12 34 56 78",
    },
    employeeNames: ["Jules Martin"],
    recommendations: ["B1V", "BR"],
    affirmations: ["Le salarié intervient sur une installation électrique."],
    answers: [
      {
        questionId: 0,
        question: "Question",
        answer: "Réponse",
        affirmation: "Affirmation",
        recommendation: "B1V",
      },
    ],
    consent: true,
    formStartedAt: Date.now() - 5_000,
    ...overrides,
  };
}

describe("prospect payload validation", () => {
  it("accepts and normalizes a complete submission", () => {
    const result = validateProspectPayload(validPayload());
    expect(result.valid).toBe(true);
    expect(result.data.contact.email).toBe("marie@example.com");
    expect(result.data.recommendations).toEqual(["B1V", "BR"]);
  });

  it("rejects an invalid email", () => {
    const result = validateProspectPayload(
      validPayload({
        contact: {
          name: "Marie Dupont",
          company: "Entreprise Exemple",
          email: "adresse-invalide",
          phone: "0612345678",
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("L’adresse e-mail est invalide.");
  });

  it("rejects an unrealistically fast submission", () => {
    const result = validateProspectPayload(validPayload({ formStartedAt: Date.now() }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Le formulaire a été envoyé trop rapidement.");
  });

  it("requires explicit consent", () => {
    const result = validateProspectPayload(validPayload({ consent: false }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Le consentement est requis.");
  });
});

describe("organization payload validation", () => {
  it("accepts a complete organization configuration", () => {
    const result = validateOrganizationPayload({
      name: "ASFOR",
      slug: "asfor",
      receptionEmail: "FORMATION@ASFOR.NET",
      senderName: "ASFOR",
      logoUrl: "https://www.asfor.net/logo.png",
      primaryColor: "#0072bc",
      websiteUrl: "https://www.asfor.net",
    });

    expect(result.valid).toBe(true);
    expect(result.data.receptionEmail).toBe("formation@asfor.net");
    expect(result.data.slug).toBe("asfor");
  });

  it("rejects an invalid slug, color and reception email", () => {
    const result = validateOrganizationPayload({
      name: "ASFOR",
      slug: "ASFOR avec espaces",
      receptionEmail: "adresse-invalide",
      senderName: "ASFOR",
      primaryColor: "bleu",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("L’identifiant du questionnaire est invalide.");
    expect(result.errors).toContain("L’adresse de réception est invalide.");
    expect(result.errors).toContain("La couleur principale est invalide.");
  });

  it("rejects non-http links", () => {
    const result = validateOrganizationPayload({
      name: "ASFOR",
      slug: "asfor",
      receptionEmail: "formation@asfor.net",
      senderName: "ASFOR",
      logoUrl: "javascript:alert(1)",
      primaryColor: "#0072bc",
      websiteUrl: "file:///etc/passwd",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("L’adresse du logo est invalide.");
    expect(result.errors).toContain("L’adresse du site internet est invalide.");
  });
});
