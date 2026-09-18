import { getConfig } from "./_lib/config.mjs";
import { reconcilePriceBands } from "./_lib/reconcile.mjs";

export default async () => {
  const config = getConfig();

  // Scheduled functions run on the production deploy, but keep this additional
  // guard so a manually-invoked preview can never alter live price bands.
  if (!config.isProduction) {
    console.log("WFD reconcile skipped: not a production deploy");
    return;
  }

  if (!config.automationEnabled) {
    console.log("WFD reconcile skipped: priceAutomationEnabled is false in integration-config-2026.mjs");
    return;
  }

  const result = await reconcilePriceBands({ mutate: true });
  console.log("WFD reconcile", JSON.stringify(result));
};
