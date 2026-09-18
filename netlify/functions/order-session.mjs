import { getConfig } from "./_lib/config.mjs";
import { json, readJson, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { getRegistration } from "./_lib/tito.mjs";
import { registrationIsUsable } from "./_lib/order.mjs";
import { sealOrderToken } from "./_lib/security.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    const config = getConfig();
    if (!config.postPurchaseEnabled) throw new HttpError(503, "Post-purchase journey is not enabled");
    const { registrationSlug, reference } = await readJson(request);
    if (!registrationSlug) throw new HttpError(400, "Missing registration slug");
    const registration = await getRegistration(registrationSlug);
    if (!registrationIsUsable(registration)) throw new HttpError(409, "This booking is not available for post-purchase actions");
    if (reference && registration.reference !== reference) throw new HttpError(400, "Booking reference mismatch");
    const token = sealOrderToken({ registrationSlug: registration.slug, reference: registration.reference });
    return json({ ok: true, token, url: `/after-booking?token=${encodeURIComponent(token)}` });
  } catch (error) {
    return toErrorResponse(error);
  }
};
