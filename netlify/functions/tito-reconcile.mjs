import { getConfig } from "./_lib/config.mjs";
import { reconcilePriceBands } from "./_lib/reconcile.mjs";

export default async () => {
  const config = getConfig();
  if (!config.automationEnabled) {
    console.log("WFD reconcile skipped: FIREWORKS_AUTOMATION_ENABLED is not true");
    return;
  }
  const result = await reconcilePriceBands({ mutate: true });
  console.log("WFD reconcile", JSON.stringify(result));
};
