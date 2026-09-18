import { getConfig } from "./_lib/config.mjs";
import { json, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { registrationFromToken, quantitySummary } from "./_lib/order.mjs";

export default async (request) => {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    const config = getConfig();
    if (!config.postPurchaseEnabled) throw new HttpError(503, "Post-purchase journey is not enabled");
    const token = new URL(request.url).searchParams.get("token");
    const registration = await registrationFromToken(token);
    return json({
      ok: true,
      reference: registration.reference,
      quantities: quantitySummary(registration),
      preferences: registration.metadata?.wfd_preferences || {},
      wordingVersion: config.manifest.preferenceWordingVersion,
      meetAndGreetEnabled: config.meetAndGreetEnabled && Boolean(config.meetAndGreet.eventSlug && config.meetAndGreet.releaseId)
    });
  } catch (error) {
    return toErrorResponse(error);
  }
};
