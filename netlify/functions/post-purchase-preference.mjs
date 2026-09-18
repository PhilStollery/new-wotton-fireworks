import { getRegistration, updateRegistrationMetadata } from "./_lib/tito.mjs";
import { json, readJson, HttpError, toErrorResponse } from "./_lib/http.mjs";

const WORDING_VERSION = "2026-09-18-v2";

const allowed = Object.freeze({
  cancellation: new Set(["donate", "refund"]),
  next_year: new Set(["yes", "no"]),
  other_events: new Set(["yes", "no"]),
  round_table_invite: new Set(["yes", "no"]),
  // Retained so existing v13-v16 test metadata can still be updated safely.
  meet_and_greet: new Set(["yes", "no"]),
  climbing: new Set(["interested", "no"])
});

function registrationIsUsable(registration) {
  if (!registration) return false;
  if (registration.refunded) return false;
  return !["cancelled", "customer_cancelled", "errored"].includes(String(registration.state || "").toLowerCase());
}

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const { registrationSlug, reference, stage, value, answers } = await readJson(request);

    if (!registrationSlug) throw new HttpError(400, "Booking details are missing");

    const updates = answers && typeof answers === "object" && !Array.isArray(answers)
      ? Object.entries(answers)
      : [[stage, value]];

    if (!updates.length || updates.length > Object.keys(allowed).length) {
      throw new HttpError(400, "Invalid preference choices");
    }
    for (const [nextStage, nextValue] of updates) {
      if (!allowed[nextStage]?.has(nextValue)) throw new HttpError(400, "Invalid preference choice");
    }

    const registration = await getRegistration(String(registrationSlug));
    if (!registration) throw new HttpError(404, "Booking not found");
    if (reference && String(registration.reference || "") !== String(reference)) {
      throw new HttpError(400, "Booking details do not match");
    }
    if (!registrationIsUsable(registration)) {
      throw new HttpError(409, "This booking can no longer be changed");
    }

    const existing = registration.metadata?.wfd_preferences;
    const preferences = existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};

    const now = new Date().toISOString();
    for (const [nextStage, nextValue] of updates) {
      preferences[nextStage] = {
        value: nextValue,
        recorded_at: now,
        wording_version: WORDING_VERSION
      };
    }

    await updateRegistrationMetadata(registration.slug, {
      wfd_preferences: preferences,
      wfd_preferences_updated_at: now,
      wfd_preferences_source: "website_post_checkout"
    }, undefined, registration);

    return json({
      ok: true,
      saved: Object.fromEntries(updates)
    });
  } catch (error) {
    return toErrorResponse(error);
  }
};
