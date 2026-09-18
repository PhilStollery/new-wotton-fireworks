import { getConfig } from "./_lib/config.mjs";
import { INTEGRATION_CONFIG_2026 } from "./_lib/integration-config-2026.mjs";
import { getActivity } from "./_lib/tito.mjs";
import { HttpError, json, toErrorResponse } from "./_lib/http.mjs";

function activitySummary(wave, activity) {
  const capacity = Number(activity?.capacity ?? 0);
  const allocationCount = Number(activity?.allocation_count ?? activity?.allocationCount ?? 0);
  const remaining = Math.max(capacity - allocationCount, 0);
  const soldOut = Boolean(activity?.sold_out) || (capacity > 0 && remaining <= 0);

  return {
    key: wave.key,
    label: wave.label,
    capacity,
    allocationCount,
    remaining,
    soldOut,
    releases: [...wave.releases]
  };
}

function validateTestWaves(waves) {
  const missing = [];
  waves.forEach((wave, index) => {
    const label = `test.waves[${index}]`;
    if (!wave.activityId) missing.push(`${label}.activityId`);
    if (!Array.isArray(wave.releases) || !wave.releases.length) missing.push(`${label}.releases`);
  });
  if (missing.length) {
    throw new HttpError(
      503,
      `Ticket test configuration is incomplete in integration-config-2026.mjs: ${missing.join(", ")}`
    );
  }
}

export default async () => {
  try {
    const config = getConfig();

    // The development integration currently exercises the two controlled test
    // Activities. Production data is configured in the same Git file, but this
    // endpoint will not expose/use it until the live handover logic is enabled.
    if (config.isProduction) {
      throw new HttpError(503, "Live ticket availability is not enabled yet.");
    }

    const wavesConfig = INTEGRATION_CONFIG_2026.tito.test.waves;
    validateTestWaves(wavesConfig);

    const activities = await Promise.all(
      wavesConfig.map((wave) => getActivity(wave.activityId))
    );

    const waves = wavesConfig.map((wave, index) => activitySummary(wave, activities[index]));
    const currentWave = waves.find((wave) => !wave.soldOut && wave.remaining > 0) || null;

    return json({
      ok: true,
      testMode: true,
      event: `${config.tito.accountSlug}/${config.tito.eventSlug}`,
      currentWave,
      waves
    });
  } catch (error) {
    return toErrorResponse(error);
  }
};
