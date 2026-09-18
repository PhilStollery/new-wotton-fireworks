import { getConfig } from "./_lib/config.mjs";
import { json, readJson, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { registrationFromToken, registrationIsUsable } from "./_lib/order.mjs";
import { updateRegistrationMetadata } from "./_lib/tito.mjs";

const allowed = {
  cancellation: new Set(["donate", "refund"]),
  next_year: new Set(["yes", "no"]),
  other_events: new Set(["yes", "no"])
};

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    const config = getConfig();
    if (!config.postPurchaseEnabled) throw new HttpError(503, "Post-purchase journey is not enabled");
    const { token, stage, value } = await readJson(request);
    if (!allowed[stage]?.has(value)) throw new HttpError(400, "Invalid preference choice");
    const registration = await registrationFromToken(token);
    if (!registrationIsUsable(registration)) throw new HttpError(409, "This booking can no longer be changed");
    const existing = registration.metadata?.wfd_preferences || {};
    const preferences = {
      ...existing,
      [stage]: {
        value,
        recorded_at: new Date().toISOString(),
        wording_version: config.manifest.preferenceWordingVersion
      }
    };
    await updateRegistrationMetadata(registration.slug, {
      wfd_preferences: preferences,
      wfd_preferences_updated_at: new Date().toISOString()
    });
    return json({ ok: true, stage, value });
  } catch (error) {
    return toErrorResponse(error);
  }
};
