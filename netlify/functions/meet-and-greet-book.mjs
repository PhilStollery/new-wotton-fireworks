import { getConfig } from "./_lib/config.mjs";
import { json, readJson, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { registrationFromToken } from "./_lib/order.mjs";
import { createRegistration, updateRegistrationMetadata } from "./_lib/tito.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    const config = getConfig();
    if (!config.meetAndGreetEnabled || !config.meetAndGreet.eventSlug || !config.meetAndGreet.releaseId) {
      throw new HttpError(503, "Meet-and-greet booking is not enabled");
    }
    const { token } = await readJson(request);
    const source = await registrationFromToken(token);
    const already = source.metadata?.wfd_meet_and_greet;
    if (already?.registration_slug) return json({ ok: true, alreadyBooked: true, reference: already.reference });
    const target = await createRegistration({
      eventSlug: config.meetAndGreet.eventSlug,
      name: source.name,
      email: source.email,
      releaseId: config.meetAndGreet.releaseId,
      notify: true
    });
    if (!target?.slug) throw new HttpError(502, "Meet-and-greet booking did not return a registration");
    await updateRegistrationMetadata(source.slug, {
      wfd_meet_and_greet: {
        registration_slug: target.slug,
        reference: target.reference || null,
        booked_at: new Date().toISOString()
      }
    });
    return json({ ok: true, reference: target.reference || null });
  } catch (error) {
    return toErrorResponse(error);
  }
};
