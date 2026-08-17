import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/supabase.js", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import handler from "../api/keepalive.js";
import { getSupabaseAdmin } from "../server/supabase.js";

const originalToken = process.env.KEEPALIVE_TOKEN;

function createResponse() {
  const response = {
    headers: {},
    statusCode: 200,
    body: undefined,
  };

  response.setHeader = vi.fn((name, value) => {
    response.headers[name] = value;
  });
  response.status = vi.fn((statusCode) => {
    response.statusCode = statusCode;
    return response;
  });
  response.json = vi.fn((body) => {
    response.body = body;
    return response;
  });
  response.end = vi.fn(() => response);

  return response;
}

beforeEach(() => {
  process.env.KEEPALIVE_TOKEN = "keepalive-token-used-only-in-tests";
  getSupabaseAdmin.mockReset();
});

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.KEEPALIVE_TOKEN;
  } else {
    process.env.KEEPALIVE_TOKEN = originalToken;
  }
});

describe("Supabase keepalive endpoint", () => {
  it("rejects requests without the dedicated token", async () => {
    const response = createResponse();

    await handler({ method: "POST", headers: {} }, response);

    expect(response.statusCode).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("performs only the lightweight organizations query", async () => {
    const limit = vi.fn().mockResolvedValue({ error: null });
    const select = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ select }));
    getSupabaseAdmin.mockReturnValue({ from });
    const response = createResponse();

    await handler(
      {
        method: "POST",
        headers: {
          authorization: "Bearer keepalive-token-used-only-in-tests",
        },
      },
      response,
    );

    expect(from).toHaveBeenCalledWith("organizations");
    expect(select).toHaveBeenCalledWith("id");
    expect(limit).toHaveBeenCalledWith(1);
    expect(response.statusCode).toBe(204);
  });
});
