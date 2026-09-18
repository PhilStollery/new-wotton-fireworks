import { getConfig, configurationStatus } from "./_lib/config.mjs";
import { json } from "./_lib/http.mjs";

export default async () => {
  const config = getConfig();
  return json({
    ok: true,
    service: "Wotton Fireworks 2026 integration scaffold",
    features: {
      automation: config.automationEnabled,
      postPurchase: config.postPurchaseEnabled,
      customConfirmation: config.customConfirmationEnabled,
      meetAndGreet: config.meetAndGreetEnabled
    },
    missing: configurationStatus(config),
    note: "No secret values are returned by this endpoint."
  });
};
