import { getConfig, configurationStatus } from "./_lib/config.mjs";
import { json } from "./_lib/http.mjs";

export default async () => {
  const config = getConfig();
  return json({
    ok: true,
    service: "Wotton Fireworks 2026 Tito integration",
    mode: config.mode,
    features: {
      priceAutomation: config.automationEnabled
    },
    missing: configurationStatus(config),
    note: "Tito handles confirmation emails, ticket QR codes and gate check-in. No secret values are returned by this endpoint."
  });
};
