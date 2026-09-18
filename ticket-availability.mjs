import { getConfig } from "./_lib/config.mjs";
import { INTEGRATION_CONFIG_2026 } from "./_lib/integration-config-2026.mjs";
import { getActivities, getActivity } from "./_lib/tito.mjs";
import { HttpError, json, toErrorResponse } from "./_lib/http.mjs";

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function activitySummary(wave, activity) {
  const capacity = Number(activity?.capacity ?? 0);
  const allocationCount = Number(activity?.allocation_count ?? activity?.allocationCount ?? 0);
  const remaining = Math.max(capacity - allocationCount, 0);
  const soldOut = Boolean(activity?.sold_out) || (capacity > 0 && remaining <= 0);
  const releaseDetails = (activity?.releases || [])
    .map((release) => ({
      id: release?.id ?? null,
      slug: release?.slug,
      title: release?.title || release?.name || release?.slug || "Ticket",
      state: release?.state_name || release?.state || null,
      offSale: Boolean(release?.off_sale),
      soldOut: Boolean(release?.sold_out),
      secret: Boolean(release?.secret),
      position: Number.isFinite(Number(release?.position)) ? Number(release.position) : null,
      minTicketsPerPerson: release?.min_tickets_per_person ?? null,
      maxTicketsPerPerson: release?.max_tickets_per_person ?? null,
      defaultQuantity: release?.default_quantity ?? null
    }))
    .filter((release) => release.slug);
  const releases = releaseDetails.map((release) => release.slug);

  if (!releases.length) {
    throw new HttpError(503, `No ticket releases are attached to Tito Activity "${wave.activityName}".`);
  }

  return {
    key: wave.key,
    label: wave.label,
    capacity,
    allocationCount,
    remaining,
    soldOut,
    releases,
    releaseDetails
  };
}

async function resolveTestWaves(wavesConfig) {
  const activities = await getActivities();

  return Promise.all(wavesConfig.map(async (wave) => {
    const matches = activities.filter((activity) => normalise(activity?.name) === normalise(wave.activityName));
    if (!matches.length) {
      throw new HttpError(503, `Tito test Activity not found: "${wave.activityName}".`);
    }
    if (matches.length > 1) {
      throw new HttpError(503, `More than one Tito test Activity is named "${wave.activityName}".`);
    }

    // Fetch the single Activity in extended form so Tito supplies the attached
    // release records, including the release slugs needed by the inline widget.
    const activity = await getActivity(matches[0].id);
    return activitySummary(wave, activity);
  }));
}

export default async () => {
  try {
    const config = getConfig();

    // Until the live handover is explicitly implemented, this endpoint is for
    // controlled Tito test-mode transactions on Deploy Previews/branch deploys.
    if (config.isProduction) {
      throw new HttpError(503, "Live ticket availability is not enabled yet.");
    }

    const wavesConfig = INTEGRATION_CONFIG_2026.tito.test.waves;
    const waves = await resolveTestWaves(wavesConfig);
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
