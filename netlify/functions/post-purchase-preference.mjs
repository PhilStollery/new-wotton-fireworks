import { getRegistration, updateRegistrationMetadata } from "./_lib/tito.mjs";
import { json, readJson, HttpError, toErrorResponse } from "./_lib/http.mjs";

const WORDING_VERSION = "2026-09-19-v3";

export const config = {
  path: "/api/post-purchase-preference",
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"]
  }
};

const allowed = Object.freeze({
  cancellation: new Set(["donate", "refund"]),
  next_year: new Set(["yes", "no"]),
  other_events: new Set(["yes", "no"]),
  round_table_invite: new Set(["yes", "no"]),
  travel: new Set(["walk", "bus_wotton", "bus_charfield", "park"])
});

function registrationIsUsable(registration) {
  if (!registration) return false;
  if (registration.refunded) return false;
  return !["cancelled", "customer_cancelled", "errored"].includes(String(registration.state || "").toLowerCase());
}

function responseEntry(stage, value, now) {
  const entry = {
    value,
    recorded_at: now,
    wording_version: WORDING_VERSION
  };
  if (stage === "round_table_invite") entry.invite_context = "autumn-2026";
  if (stage === "travel") entry.response_source = "pre_checkout_travel_cards";
  return entry;
}

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 8_192) throw new HttpError(413, "Request is too large");

    const { registrationSlug, reference, stage, value, answers } = await readJson(request);
    const slug = String(registrationSlug || "").trim();
    const suppliedReference = String(reference || "").trim();

    if (!slug || !suppliedReference) throw new HttpError(400, "Booking details are missing");
    if (slug.length > 200 || suppliedReference.length > 100) {
      throw new HttpError(400, "Booking details are invalid");
    }

    const updates = answers && typeof answers === "object" && !Array.isArray(answers)
      ? Object.entries(answers)
      : [[stage, value]];

    if (!updates.length || updates.length > Object.keys(allowed).length) {
      throw new HttpError(400, "Invalid preference choices");
    }
    for (const [nextStage, nextValue] of updates) {
      if (!allowed[nextStage]?.has(nextValue)) throw new HttpError(400, "Invalid preference choice");
    }

    const registration = await getRegistration(slug);
    if (!registration) throw new HttpError(404, "Booking not found");
    if (String(registration.reference || "").trim() !== suppliedReference) {
      throw new HttpError(400, "Booking details do not match");
    }
    if (!registrationIsUsable(registration)) {
      throw new HttpError(409, "This booking can no longer be changed");
    }

    // v19 starts a clean, forward-compatible response namespace. Existing
    // wfd_preferences metadata from earlier test versions is deliberately left
    // untouched rather than destructively migrated.
    const existing = registration.metadata?.wfd_responses;
    const responses = existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};

    const now = new Date().toISOString();
    for (const [nextStage, nextValue] of updates) {
      responses[nextStage] = responseEntry(nextStage, nextValue, now);
    }

    await updateRegistrationMetadata(registration.slug, {
      wfd_responses: responses,
      wfd_responses_updated_at: now,
      wfd_responses_source: "website_post_checkout"
    }, undefined, registration);

    return json({
      ok: true,
      saved: Object.fromEntries(updates)
    });
  } catch (error) {
    console.error("WFD post-purchase preference error", error?.status || 500, error?.message || error);
    return toErrorResponse(error);
  }
};
