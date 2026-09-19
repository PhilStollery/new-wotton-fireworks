import { DateTime } from "luxon";
import { getConfig } from "./_lib/config.mjs";
import { INTEGRATION_CONFIG_2026 } from "./_lib/integration-config-2026.mjs";
import { getActivities, getActivity, getReleases } from "./_lib/tito.mjs";
import { HttpError, json, toErrorResponse } from "./_lib/http.mjs";

const CACHE_TTL_MS = 10_000;
let cachedPayload = null;
let cachedAt = 0;
let refreshInFlight = null;

export const config = {
  path: "/api/ticket-availability"
};

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function releaseSummary(release) {
  if (!release?.slug) return null;
  return {
    id: release?.id ?? null,
    slug: release.slug,
    title: release?.title || release?.name || release.slug || "Ticket",
    state: release?.state_name || release?.state || null,
    offSale: Boolean(release?.off_sale),
    soldOut: Boolean(release?.sold_out),
    secret: Boolean(release?.secret),
    position: Number.isFinite(Number(release?.position)) ? Number(release.position) : null,
    minTicketsPerPerson: release?.min_tickets_per_person ?? null,
    maxTicketsPerPerson: release?.max_tickets_per_person ?? null,
    defaultQuantity: release?.default_quantity ?? null
  };
}

function uniqueReleaseDetails(...sources) {
  const bySlug = new Map();
  sources.flat().forEach((release) => {
    const summary = release?.slug && Object.prototype.hasOwnProperty.call(release, "offSale")
      ? release
      : releaseSummary(release);
    if (summary?.slug && !bySlug.has(summary.slug)) bySlug.set(summary.slug, summary);
  });
  return [...bySlug.values()].sort((a, b) => {
    const pa = Number(a.position);
    const pb = Number(b.position);
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
    return String(a.title).localeCompare(String(b.title));
  });
}

function pickReleaseDetails(slugs, activity, allReleaseDetails) {
  const wanted = new Set((slugs || []).filter(Boolean).map(String));
  const activityDetails = uniqueReleaseDetails(activity?.releases || []);
  const source = uniqueReleaseDetails(activityDetails, allReleaseDetails);
  if (!wanted.size) return activityDetails;
  return source.filter((release) => wanted.has(String(release.slug)));
}

function activitySummary({ key, label, activityName, counterMode = "capacity" }, activity, releaseDetails = null) {
  const capacity = Number.isFinite(Number(activity?.capacity)) ? Number(activity.capacity) : null;
  const allocationCount = Number(activity?.allocation_count ?? activity?.allocationCount ?? 0);
  const remaining = capacity == null ? null : Math.max(capacity - allocationCount, 0);
  const details = uniqueReleaseDetails(releaseDetails || activity?.releases || []);
  const releases = details.map((release) => release.slug);

  if (!releases.length) {
    throw new HttpError(503, `No ticket releases are attached to Tito Activity "${activityName || label}".`);
  }

  return {
    key,
    label,
    capacity,
    allocationCount,
    remaining,
    soldOut: Boolean(activity?.sold_out) || (capacity != null && capacity > 0 && remaining <= 0),
    counterMode,
    releases,
    releaseDetails: details
  };
}

function staticGroup({ key, label, counterMode, releaseDetails, soldOut = null, capacity = null, allocationCount = 0, remaining = null }) {
  const details = uniqueReleaseDetails(releaseDetails || []);
  if (!details.length) return null;
  const releaseSoldOut = details.every((release) => release.soldOut || release.offSale);
  return {
    key,
    label,
    capacity,
    allocationCount,
    remaining,
    soldOut: soldOut == null ? releaseSoldOut : Boolean(soldOut),
    counterMode,
    releases: details.map((release) => release.slug),
    releaseDetails: details
  };
}

function isPreschoolRelease(release) {
  return /pre[- ]?school|not yet in school|before reception|nursery|under\s*5/i.test(String(release?.title || release?.slug || ""));
}

function isBlueBadgeParking(release) {
  return /blue\s*badge|accessible\s*parking|disabled\s*parking/i.test(String(release?.title || release?.slug || ""));
}

function isParkingRelease(release) {
  return /parking|car\s*park/i.test(String(release?.title || release?.slug || ""));
}

function isPaidParking(release) {
  const text = String(release?.title || release?.slug || "");
  return isParkingRelease(release) && !isBlueBadgeParking(release) && !/complimentary|free\s*parking/i.test(text);
}

function isStandardRelease(release) {
  return /standard/i.test(String(release?.title || release?.slug || "")) && !isParkingRelease(release);
}

function usableWave(wave) {
  if (!wave || wave.soldOut || wave.expired) return false;
  return wave.remaining == null || Number(wave.remaining) > 0;
}

async function buildTestAvailability(config) {
  const [activities, rawReleases] = await Promise.all([getActivities(), getReleases()]);
  const allReleaseDetails = uniqueReleaseDetails(rawReleases);
  const waves = [];

  for (const wave of INTEGRATION_CONFIG_2026.tito.test.waves) {
    const matches = activities.filter((activity) => normalise(activity?.name) === normalise(wave.activityName));
    if (!matches.length) {
      throw new HttpError(503, `Tito test Activity not found: "${wave.activityName}".`);
    }
    if (matches.length > 1) {
      throw new HttpError(503, `More than one Tito test Activity is named "${wave.activityName}".`);
    }
    const activity = await getActivity(matches[0].id);
    waves.push(activitySummary(wave, activity));
  }

  const used = new Set(waves.flatMap((wave) => wave.releases));
  const unmatched = allReleaseDetails.filter((release) => !used.has(release.slug));

  // In test mode, keep the existing named test Activities as the authoritative
  // capacity waves, but also discover the real standalone releases now on sale.
  // If Standard tickets are present outside the two test Activities, expose them
  // as the final hidden band so the complete customer journey can be tested.
  const standardDetails = unmatched.filter(isStandardRelease);
  if (standardDetails.length) {
    waves.push(staticGroup({
      key: "standard",
      label: "Standard",
      counterMode: "standard-static",
      releaseDetails: standardDetails,
      capacity: config.manifest.eventCapacity,
      remaining: config.manifest.eventCapacity
    }));
    standardDetails.forEach((release) => used.add(release.slug));
  }

  const remainingUnmatched = allReleaseDetails.filter((release) => !used.has(release.slug));
  const preschoolDetails = remainingUnmatched.filter(isPreschoolRelease);
  const paidParkingDetails = remainingUnmatched.filter(isPaidParking);
  const blueBadgeDetails = remainingUnmatched.filter(isBlueBadgeParking);

  const standaloneGroups = [
    staticGroup({
      key: "preschool",
      label: "Everyone attending needs a ticket",
      counterMode: "ticket-reminder",
      releaseDetails: preschoolDetails,
      capacity: config.manifest.eventCapacity,
      remaining: config.manifest.eventCapacity
    })
  ].filter(Boolean);

  const parkingGroups = [
    staticGroup({
      key: "general-parking",
      label: "Parking",
      counterMode: "parking-general",
      releaseDetails: paidParkingDetails,
      capacity: config.manifest.generalParkingCapacity,
      remaining: config.manifest.generalParkingCapacity
    }),
    staticGroup({
      key: "blue-badge-parking",
      label: "Blue Badge parking",
      counterMode: "parking-accessible",
      releaseDetails: blueBadgeDetails,
      capacity: config.manifest.blueBadgeReserve,
      remaining: config.manifest.blueBadgeReserve
    })
  ].filter(Boolean);

  return {
    ok: true,
    testMode: true,
    event: `${config.tito.accountSlug}/${config.tito.eventSlug}`,
    currentWave: waves.find(usableWave) || null,
    waves,
    // fireworks-2026.js already treats parkingGroups as always-visible groups.
    // Include the standalone pre-school release here so v19 can add its static
    // ticket reminder without changing the proven core checkout script.
    parkingGroups: [...standaloneGroups, ...parkingGroups]
  };
}

function requireLiveConfiguration(config) {
  const missing = [];
  const expect = (name, value) => { if (!value || (Array.isArray(value) && !value.length)) missing.push(name); };
  expect("live.eventCapacityActivityId", config.tito.activities.eventCapacity);
  expect("live.superSaverActivityId", config.tito.activities.superSaver);
  expect("live.advanceActivityId", config.tito.activities.advance);
  expect("live.parkingCapacityActivityId", config.tito.activities.parkingCapacity);
  expect("live.generalParkingActivityId", config.tito.activities.generalParking);
  expect("live.superSaverReleases", config.tito.releases.superSaver);
  expect("live.advanceReleases", config.tito.releases.advance);
  expect("live.standardReleases", config.tito.releases.standard);
  expect("live.preschoolRelease", config.tito.releases.preschool);
  expect("live.paidParkingRelease", config.tito.releases.paidParking);
  expect("live.blueBadgeParkingRelease", config.tito.releases.blueBadgeParking);
  if (missing.length) throw new HttpError(503, `Live Tito configuration is incomplete: ${missing.join(", ")}`);
}

async function buildLiveAvailability(config) {
  requireLiveConfiguration(config);

  const [eventActivity, superSaverActivity, advanceActivity, parkingActivity, generalParkingActivity, rawReleases] = await Promise.all([
    getActivity(config.tito.activities.eventCapacity),
    getActivity(config.tito.activities.superSaver),
    getActivity(config.tito.activities.advance),
    getActivity(config.tito.activities.parkingCapacity),
    getActivity(config.tito.activities.generalParking),
    getReleases()
  ]);
  const allReleaseDetails = uniqueReleaseDetails(rawReleases);

  const zone = config.manifest.timezone;
  const now = DateTime.utc().setZone(zone);
  const salesOpen = DateTime.fromISO(config.manifest.salesOpenLocal, { zone });
  const superSaverCutoff = DateTime.fromISO(config.manifest.superSaverCutoffLocal, { zone });
  const advanceCutoff = DateTime.fromISO(config.manifest.advanceCutoffLocal, { zone });
  const admissionClose = DateTime.fromISO(config.manifest.admissionCloseLocal, { zone });

  const superSaver = activitySummary(
    { key: "super-saver", label: "Super Saver" },
    superSaverActivity,
    pickReleaseDetails(config.tito.releases.superSaver, superSaverActivity, allReleaseDetails)
  );
  superSaver.expired = now >= superSaverCutoff;

  const advance = activitySummary(
    { key: "advance", label: "Advance" },
    advanceActivity,
    pickReleaseDetails(config.tito.releases.advance, advanceActivity, allReleaseDetails)
  );
  advance.expired = now >= advanceCutoff;

  const standard = activitySummary(
    { key: "standard", label: "Standard" },
    eventActivity,
    pickReleaseDetails(config.tito.releases.standard, eventActivity, allReleaseDetails)
  );
  standard.expired = now >= admissionClose;

  const preschool = staticGroup({
    key: "preschool",
    label: "Everyone attending needs a ticket",
    counterMode: "ticket-reminder",
    releaseDetails: pickReleaseDetails([config.tito.releases.preschool], eventActivity, allReleaseDetails),
    capacity: standard.capacity,
    remaining: standard.remaining,
    soldOut: Boolean(eventActivity?.sold_out) || standard.remaining === 0
  });

  const generalParking = activitySummary(
    { key: "general-parking", label: "Parking", counterMode: "parking-general" },
    generalParkingActivity,
    pickReleaseDetails([config.tito.releases.paidParking], generalParkingActivity, allReleaseDetails)
  );

  const blueBadgeParking = staticGroup({
    key: "blue-badge-parking",
    label: "Blue Badge parking",
    counterMode: "parking-accessible",
    releaseDetails: pickReleaseDetails([config.tito.releases.blueBadgeParking], parkingActivity, allReleaseDetails),
    capacity: Number.isFinite(Number(parkingActivity?.capacity)) ? Number(parkingActivity.capacity) : null,
    remaining: Number.isFinite(Number(parkingActivity?.capacity))
      ? Math.max(Number(parkingActivity.capacity) - Number(parkingActivity?.allocation_count || 0), 0)
      : null,
    soldOut: Boolean(parkingActivity?.sold_out) || (Number(parkingActivity?.capacity || 0) > 0 && Number(parkingActivity?.allocation_count || 0) >= Number(parkingActivity.capacity))
  });

  const waves = [superSaver, advance, standard];
  const currentWave = now < salesOpen || now >= admissionClose
    ? null
    : waves.find(usableWave) || null;

  return {
    ok: true,
    testMode: false,
    event: `${config.tito.accountSlug}/${config.tito.eventSlug}`,
    salesState: now < salesOpen ? "not_open" : (now >= admissionClose ? "closed" : "open"),
    currentWave,
    waves,
    parkingGroups: [preschool, generalParking, blueBadgeParking].filter(Boolean)
  };
}

async function buildAvailabilityPayload(config) {
  return config.isProduction ? buildLiveAvailability(config) : buildTestAvailability(config);
}

async function cachedAvailabilityPayload(config) {
  const now = Date.now();
  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) return cachedPayload;

  if (!refreshInFlight) {
    refreshInFlight = buildAvailabilityPayload(config)
      .then((payload) => {
        cachedPayload = payload;
        cachedAt = Date.now();
        return payload;
      })
      .catch((error) => {
        // Availability counters are advisory; Tito remains the system of record.
        // If a refresh fails, prefer the last known-good state to a launch-time
        // outage while the cached state is still reasonably recent.
        if (cachedPayload && Date.now() - cachedAt < 5 * 60_000) {
          return { ...cachedPayload, stale: true };
        }
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

export default async () => {
  try {
    const config = getConfig();
    const payload = await cachedAvailabilityPayload(config);

    return json(payload, 200, {
      "Netlify-CDN-Cache-Control": "public, durable, s-maxage=10, stale-while-revalidate=30"
    });
  } catch (error) {
    console.error("WFD ticket availability error", error?.status || 500, error?.message || error);
    return toErrorResponse(error);
  }
};
