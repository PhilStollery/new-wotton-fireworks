import { getConfig } from "./_lib/config.mjs";
import { json, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { verifyTitoWebhook, sealOrderToken } from "./_lib/security.mjs";
import { getRegistration, updateRegistrationMetadata } from "./_lib/tito.mjs";
import { buildConfirmation, deliverEmail } from "./_lib/email.mjs";
import { reconcilePriceBands } from "./_lib/reconcile.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    const config = getConfig();
    const raw = await request.text();
    const signature = request.headers.get("tito-signature") || "";
    if (!config.tito.webhookSecurityToken) throw new HttpError(503, "Tito webhook security token is not configured");
    if (!verifyTitoWebhook(raw, signature, config.tito.webhookSecurityToken)) throw new HttpError(401, "Invalid Tito webhook signature");
    const eventName = request.headers.get("x-webhook-name") || "";
    const payload = JSON.parse(raw || "{}");

    if (eventName === "registration.finished") {
      const registration = await getRegistration(payload.slug);
      if (!registration) throw new HttpError(404, "Registration not found");

      if (config.customConfirmationEnabled && !registration.metadata?.wfd_confirmation_sent_at) {
        const token = sealOrderToken({ registrationSlug: registration.slug, reference: registration.reference });
        const message = buildConfirmation(registration, token);
        await deliverEmail({ to: registration.email, ...message });
        await updateRegistrationMetadata(registration.slug, {
          wfd_confirmation_sent_at: new Date().toISOString(),
          wfd_confirmation_version: config.manifest.confirmationVersion
        });
      }

      if (config.automationEnabled) await reconcilePriceBands({ mutate: true });
    }

    return json({ ok: true, received: eventName });
  } catch (error) {
    return toErrorResponse(error);
  }
};
