import { createHmac } from "node:crypto";

export function setApiHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export function isRequestBodyTooLarge(req, maximumBytes = 64 * 1024) {
  const contentLength = Number(req.headers["content-length"] || 0);
  return Number.isFinite(contentLength) && contentLength > maximumBytes;
}

export function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host) {
    return false;
  }

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const rawValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return rawValue?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

export function hashClientIp(ipAddress) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("RATE_LIMIT_SECRET doit contenir au moins 24 caractères.");
  }

  return createHmac("sha256", secret).update(ipAddress).digest("hex");
}

export function getRateLimitSettings() {
  const requestedMaximum = Number.parseInt(process.env.RATE_LIMIT_MAX || "5", 10);
  const requestedWindow = Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MINUTES || "15",
    10,
  );

  return {
    maximum: Number.isFinite(requestedMaximum)
      ? Math.min(Math.max(requestedMaximum, 1), 50)
      : 5,
    windowMinutes: Number.isFinite(requestedWindow)
      ? Math.min(Math.max(requestedWindow, 1), 1440)
      : 15,
  };
}

export function safeRequestMetadata(req) {
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);
  const referer = String(req.headers.referer || "").slice(0, 500);

  return {
    userAgent,
    referer,
  };
}
