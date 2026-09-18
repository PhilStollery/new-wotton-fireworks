import { getConfig } from "./_lib/config.mjs";
import { getActivity } from "./_lib/tito.mjs";
import { HttpError, json, toErrorResponse } from "./_lib/http.mjs";

const csv = (value) => String(value || "")
  .split(",")
  .map((part) => part.trim())
  .filter(Boolean);

function activitySummary(key, label, activity, releases) {
  const capacity = Number(activity?.capacity ?? 0);
  const allocationCount = Number(activity?.allocation_count ?? activity?.allocationCount ?? 0);
  const remaining = Math.max(capacity - allocationCount, 0);
  const soldOut = Boolean(activity?.sold_out) || (capacity > 0 && remaining <= 0);

  return {
    key,
    label,
    capacity,
    allocationCount,
    remaining,
    soldOut,
    releases
  };
}

export default async () => {
  try {
    if (String(process.env.TITO_WIDGET_TEST_MODE || "").toLowerCase() !== "true") {
      throw new HttpError(503, "Ticket testing is not enabled for this deploy.");
    }

    const waveOneActivityId = process.env.TITO_TEST_WAVE_1_ACTIVITY_ID || "";
    const waveTwoActivityId = process.env.TITO_TEST_WAVE_2_ACTIVITY_ID || "";
    const waveOneReleases = csv(process.env.TITO_TEST_WAVE_1_RELEASES);
    const waveTwoReleases = csv(process.env.TITO_TEST_WAVE_2_RELEASES);

    const missing = [];
    if (!waveOneActivityId) missing.push("TITO_TEST_WAVE_1_ACTIVITY_ID");
    if (!waveTwoActivityId) missing.push("TITO_TEST_WAVE_2_ACTIVITY_ID");
    if (!waveOneReleases.length) missing.push("TITO_TEST_WAVE_1_RELEASES");
    if (!waveTwoReleases.length) missing.push("TITO_TEST_WAVE_2_RELEASES");

    if (missing.length) {
      throw new HttpError(503, `Ticket test configuration is incomplete: ${missing.join(", ")}`);
    }

    const config = getConfig();
    const [waveOneActivity, waveTwoActivity] = await Promise.all([
      getActivity(waveOneActivityId),
      getActivity(waveTwoActivityId)
    ]);

    const waves = [
      activitySummary("wave-1", "Test Wave One", waveOneActivity, waveOneReleases),
      activitySummary("wave-2", "Test Wave Two", waveTwoActivity, waveTwoReleases)
    ];

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
