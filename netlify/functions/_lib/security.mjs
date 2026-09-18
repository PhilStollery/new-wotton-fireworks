import crypto from "node:crypto";
import { DateTime } from "luxon";
import { getConfig } from "./config.mjs";
import { HttpError } from "./http.mjs";

function b64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function fromB64url(value) {
  return Buffer.from(value, "base64url");
}

function keyFromSecret(secret) {
  if (!secret || secret.length < 24) throw new HttpError(503, "Group QR secret is not configured");
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyTitoWebhook(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return constantTimeEqual(expected, signature);
}

export function sealOrderToken({ registrationSlug, reference = "" }) {
  const config = getConfig();
  const key = keyFromSecret(config.groupQrSecret);
  const iv = crypto.randomBytes(12);
  const expires = DateTime.fromISO(config.manifest.tokenExpiresLocal, { zone: config.manifest.timezone }).toUTC();
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    r: registrationSlug,
    ref: reference,
    exp: Math.floor(expires.toSeconds())
  }), "utf8");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [b64url(iv), b64url(tag), b64url(ciphertext)].join(".");
}

export function openOrderToken(token) {
  const config = getConfig();
  const key = keyFromSecret(config.groupQrSecret);
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new HttpError(400, "Invalid order token");
  try {
    const [iv, tag, ciphertext] = parts.map(fromB64url);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const raw = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const payload = JSON.parse(raw);
    if (!payload.r || !payload.exp) throw new Error("Invalid payload");
    if (Date.now() / 1000 > payload.exp) throw new HttpError(410, "This order token has expired");
    return { registrationSlug: payload.r, reference: payload.ref || "" };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid order token");
  }
}

export function requireGateStaff(request) {
  const config = getConfig();
  if (!config.gateStaffKey) throw new HttpError(503, "Gate staff access is not configured");
  const supplied = request.headers.get("x-gate-key") || "";
  if (!constantTimeEqual(supplied, config.gateStaffKey)) throw new HttpError(401, "Staff access code is incorrect");
}
