import { randomBytes } from "node:crypto";
import { getAuthenticatedUser, getUserMembership } from "../server/auth.js";
import {
  isRequestBodyTooLarge,
  isSameOriginRequest,
  setApiHeaders,
} from "../server/security.js";
import { getSupabaseAdmin } from "../server/supabase.js";

const MAXIMUM_LOGO_BYTES = 1_500_000;
const CONTENT_TYPES = {
  "image/jpeg": {
    extension: "jpg",
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    matches: (bytes) =>
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  "image/webp": {
    extension: "webp",
    matches: (bytes) =>
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString());
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function decodeLogo(body) {
  const contentType = String(body?.contentType || "").toLowerCase();
  const descriptor = CONTENT_TYPES[contentType];
  const base64 = String(body?.base64 || "");

  if (!descriptor || !/^[a-z0-9+/]+={0,2}$/iu.test(base64)) {
    return null;
  }

  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > MAXIMUM_LOGO_BYTES || !descriptor.matches(bytes)) {
    return null;
  }

  return { bytes, contentType, extension: descriptor.extension };
}

export default async function handler(req, res) {
  setApiHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." });
  }
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ code: "INVALID_ORIGIN", message: "Origine non autorisée." });
  }
  if (isRequestBodyTooLarge(req, 2_100_000)) {
    return res.status(413).json({
      code: "PAYLOAD_TOO_LARGE",
      message: "Le logo dépasse la taille maximale de 1,5 Mo.",
    });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Connectez-vous pour continuer." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const membership = await getUserMembership(supabase, user.id);
    if (!membership || membership.role !== "admin") {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "Seul un administrateur peut modifier le logo.",
      });
    }

    const logo = decodeLogo(await readJsonBody(req));
    if (!logo) {
      return res.status(400).json({
        code: "INVALID_LOGO",
        message: "Choisissez une image PNG, JPG ou WebP de 1,5 Mo maximum.",
      });
    }

    const objectPath =
      `${membership.organization_id}/logo-${Date.now()}-` +
      `${randomBytes(6).toString("hex")}.${logo.extension}`;
    const { error: uploadError } = await supabase.storage
      .from("organization-assets")
      .upload(objectPath, logo.bytes, {
        cacheControl: "31536000",
        contentType: logo.contentType,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("organization-assets")
      .getPublicUrl(objectPath);
    const logoUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: logoUrl })
      .eq("id", membership.organization_id);
    if (updateError) throw updateError;

    return res.status(200).json({ logoUrl });
  } catch (error) {
    console.error("Organization logo upload failed", error);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Le logo ne peut pas être enregistré pour le moment.",
    });
  }
}
