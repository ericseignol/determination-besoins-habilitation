import { afterEach, describe, expect, it } from "vitest";
import { hashClientIp, isSameOriginRequest } from "../server/security.js";

const originalSecret = process.env.RATE_LIMIT_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.RATE_LIMIT_SECRET;
  } else {
    process.env.RATE_LIMIT_SECRET = originalSecret;
  }
});

describe("server request security", () => {
  it("accepts the application origin", () => {
    const request = {
      headers: {
        origin: "https://questionnaire.example.fr",
        host: "questionnaire.example.fr",
      },
    };
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a foreign browser origin", () => {
    const request = {
      headers: {
        origin: "https://site-malveillant.example",
        host: "questionnaire.example.fr",
      },
    };
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("stores a deterministic HMAC instead of the raw IP address", () => {
    process.env.RATE_LIMIT_SECRET = "secret-de-test-suffisamment-long";
    const firstHash = hashClientIp("203.0.113.42");
    const secondHash = hashClientIp("203.0.113.42");

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
    expect(firstHash).not.toContain("203.0.113.42");
  });
});
