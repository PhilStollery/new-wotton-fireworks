import { DateTime } from "luxon";
import { getConfig } from "./_lib/config.mjs";
import { getActivity, getReleases } from "./_lib/tito.mjs";
import { HttpError, json, toErrorResponse } from "./_lib/http.mjs";

const CACHE_TTL_MS = 10_000;
const UNBOUNDED_LOCAL_REMAINING = 1_000_000;
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
    archived: Boolean(release?.archived),
    expired: Boolean(release?.expired),
    upcoming: Boolean(release?.upcoming),
    allocatable: release?.allocatable == null ? null : Boolean(release.allocatable),
    quantity: Number.isFinite(Number(release?.quantity)) ? Number(release.quantity) : null,
    ticketsCount: Number(release?.tickets_count ?? 0),
    position: Number.isFinite(Number(release?.position)) ? Number(release.position) : null,
    minTicketsPerPerson: release?.min_tickets_per_person ?? null,
    maxTicketsPerPerson: release?.max_tickets_per_person ?? null,
    defaultQuantity: release?.default_quantity ?? null,
    activities: Array.isArray(release?.activities) ? release.activities : []
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

function releaseIsAvailable(release) {
  if (!release) return false;
  if (release.archived || release.offSale || release.expired || release.upcoming || release.soldOut) return false;
  if (release.allocatable === false) return false;
  return true;
}

function releaseGroupSoldOut(details) {
  return Boolean(details.length) && details.every((release) => !releaseIsAvailable(release));
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
    soldOut: Boolean(activity?.sold_out) || (capacity != null && capacity > 0 && remaining <= 0) || releaseGroupSoldOut(details),
    counterMode,
    releases,
    releaseDetails: details
  };
}

function staticGroup({ key, label, counterMode, releaseDetails, soldOut = null, capacity = null, allocationCount = 0, remaining = null }) {
  const details = uniqueReleaseDetails(releaseDetails || []);
  if (!details.length) return null;
  return {
    key,
    label,
    capacity,
    allocationCount,
    remaining,
    soldOut: soldOut == null ? releaseGroupSoldOut(details) : Boolean(soldOut),
    counterMode,
    releases: details.map((release) => release.slug),
    releaseDetails: details
  };
}

function releaseText(release) {
  return String(`${release?.title || ""} ${release?.slug || ""}`);
}

function isPreschoolRelease(release) {
  return /pre[- ]?school|not yet in school|before reception|nursery|under\s*5/i.test(releaseText(release));
}

function isBlueBadgeParking(release) {
  return /blue\s*badge|accessible\s*parking|disabled\s*parking/i.test(releaseText(release));
}

function isParkingRelease(release) {
  return /parking|car\s*park/i.test(releaseText(release));
}

function isPaidParking(release) {
  return isParkingRelease(release) && !isBlueBadgeParking(release) && !/complimentary|free\s*parking/i.test(releaseText(release));
}

function isSuperSaverRelease(release) {
  return /super[\s_-]*saver/i.test(releaseText(release)) && !isParkingRelease(release);
}

function isAdvanceRelease(release) {
  return /\badvance(?:d)?\b/i.test(releaseText(release)) && !isParkingRelease(release);
}

function isStandardRelease(release) {
  return /\bstandard\b/i.test(releaseText(release)) && !isParkingRelease(release);
}

function isComplimentaryRelease(release) {
  return /complimentary|\bcomp\b|volunteer|staff|crew|trader|vendor|sponsor/i.test(releaseText(release));
}

function isLegacyTestRelease(release) {
  return /\btest\s*wave\b|^test[\s_-]/i.test(releaseText(release));
}

function configuredOrMatched(configuredSlugs, allReleaseDetails, predicate) {
  const configured = new Set((configuredSlugs || []).filter(Boolean).map(String));
  const byConfig = configured.size
    ? allReleaseDetails.filter((release) => configured.has(String(release.slug)))
    : [];
  return byConfig.length ? byConfig : allReleaseDetails.filter(predicate);
}

function soldCount(details) {
  return details.reduce((sum, release) => sum + Math.max(0, Number(release.ticketsCount || 0)), 0);
}

function testWave({ key, label, counterMode = "capacity", releaseDetails, capacity }) {
  const details = uniqueReleaseDetails(releaseDetails || []);
  if (!details.length) return null;
  const allocationCount = soldCount(details);
  const remaining = Number.isFinite(Number(capacity))
    ? Math.max(Number(capacity) - allocationCount, 0)
    : UNBOUNDED_LOCAL_REMAINING;
  return staticGroup({
    key,
    label,
    counterMode,
    releaseDetails: details,
    capacity: Number.isFinite(Number(capacity)) ? Number(capacity) : null,
    allocationCount,
    remaining,
    soldOut: releaseGroupSoldOut(details) || remaining <= 0
  });
}

function releaseSpecificRemaining(details, fallbackCapacity) {
  const quantities = details.map((release) => release.quantity).filter((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
  if (quantities.length === details.length && details.length) {
    return Math.max(quantities.reduce((sum, value) => sum + Number(value), 0) - soldCount(details), 0);
  }
  if (Number.isFinite(Number(fallbackCapacity))) {
    return Math.max(Number(fallbackCapacity) - soldCount(details), 0);
  }
  return UNBOUNDED_LOCAL_REMAINING;
}

function usableWave(wave) {
  if (!wave || wave.soldOut || wave.expired) return false;
  return wave.remaining == null || Number(wave.remaining) > 0;
}

async function buildTestAvailability(config) {
  // Tito's widget test_mode plugin handles test checkout. For preview we now use
  // the real customer-facing releases, so the preview mirrors the launch layout
  // while transactions remain test transactions.
  const rawReleases = await getReleases();
  const allReleaseDetails = uniqueReleaseDetails(rawReleases)
    .filter((release) => !release.archived && !isComplimentaryRelease(release) && !isLegacyTestRelease(release));

  const superSaverDetails = configuredOrMatched(config.tito.releases.superSaver, allReleaseDetails, isSuperSaverRelease);
  const advanceDetails = configuredOrMatched(config.tito.releases.advance, allReleaseDetails, isAdvanceRelease);
  const standardDetails = configuredOrMatched(config.tito.releases.standard, allReleaseDetails, isStandardRelease);
  const preschoolDetails = configuredOrMatched([config.tito.releases.preschool], allReleaseDetails, isPreschoolRelease);
  const paidParkingDetails = configuredOrMatched([config.tito.releases.paidParking], allReleaseDetails, isPaidParking);
  const blueBadgeDetails = configuredOrMatched([config.tito.releases.blueBadgeParking], allReleaseDetails, isBlueBadgeParking);

  const waves = [
    testWave({
      key: "super-saver",
      label: "Super Saver",
      releaseDetails: superSaverDetails,
      capacity: config.manifest.superSaverCapacity
    }),
    testWave({
      key: "advance",
      label: "Advance",
      releaseDetails: advanceDetails,
      capacity: config.manifest.advanceCapacity
    }),
    standardDetails.length ? staticGroup({
      key: "standard",
      label: "Standard",
      counterMode: "standard-static",
      releaseDetails: standardDetails,
      remaining: UNBOUNDED_LOCAL_REMAINING
    }) : null
  ].filter(Boolean);

  if (!waves.length) {
    throw new HttpError(503, "No customer admission releases could be identified. Check that the Super Saver, Advance and Standard tickets are on sale and named/configured as expected.");
  }

  // Pre-school is deliberately kept out of the paid price waves. A large local
  // remaining value prevents the presentation layer from imposing a fake cap;
  // Tito's own release/Activity limits remain authoritative. The front end
  // replaces the generated counter with a static all-attendees reminder.
  const preschool = preschoolDetails.length ? staticGroup({
    key: "preschool",
    label: "Everyone attending needs a ticket",
    counterMode: "ticket-reminder",
    releaseDetails: preschoolDetails,
    remaining: UNBOUNDED_LOCAL_REMAINING
  }) : null;

  const generalParkingRemaining = releaseSpecificRemaining(paidParkingDetails, config.manifest.generalParkingCapacity);
  const blueBadgeRemaining = releaseSpecificRemaining(blueBadgeDetails, config.manifest.blueBadgeReserve);

  const generalParking = paidParkingDetails.length ? staticGroup({
    key: "general-parking",
    label: "Parking",
    counterMode: "parking-general",
    releaseDetails: paidParkingDetails,
    capacity: config.manifest.generalParkingCapacity,
    allocationCount: soldCount(paidParkingDetails),
    remaining: generalParkingRemaining,
    soldOut: releaseGroupSoldOut(paidParkingDetails) || generalParkingRemaining <= 0
  }) : null;

  const blueBadgeParking = blueBadgeDetails.length ? staticGroup({
    key: "blue-badge-parking",
    label: "Blue Badge parking",
    counterMode: "parking-accessible",
    releaseDetails: blueBadgeDetails,
    capacity: config.manifest.blueBadgeReserve,
    allocationCount: soldCount(blueBadgeDetails),
    remaining: blueBadgeRemaining,
    soldOut: releaseGroupSoldOut(blueBadgeDetails) || blueBadgeRemaining <= 0
  }) : null;

  return {
    ok: true,
    testMode: true,
    event: `${config.tito.accountSlug}/${config.tito.eventSlug}`,
    currentWave: waves.find(usableWave) || null,
    waves,
    parkingGroups: [preschool, generalParking, blueBadgeParking].filter(Boolean)
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
    { key: "standard", label: "Standard", counterMode: "standard-static" },
    eventActivity,
    pickReleaseDetails(config.tito.releases.standard, eventActivity, allReleaseDetails)
  );
  standard.expired = now >= admissionClose;

  const preschool = staticGroup({
    key: "preschool",
    label: "Everyone attending needs a ticket",
    counterMode: "ticket-reminder",
    releaseDetails: pickReleaseDetails([config.tito.releases.preschool], eventActivity, allReleaseDetails),
    remaining: UNBOUNDED_LOCAL_REMAINING,
    soldOut: Boolean(eventActivity?.sold_out) || standard.remaining === 0
  });

  const generalParking = activitySummary(
    { key: "general-parking", label: "Parking", counterMode: "parking-general" },
    generalParkingActivity,
    pickReleaseDetails([config.tito.releases.paidParking], generalParkingActivity, allReleaseDetails)
  );

  const blueBadgeDetails = pickReleaseDetails([config.tito.releases.blueBadgeParking], parkingActivity, allReleaseDetails);
  const blueBadgeRemaining = releaseSpecificRemaining(blueBadgeDetails, config.manifest.blueBadgeReserve);
  const blueBadgeParking = staticGroup({
    key: "blue-badge-parking",
    label: "Blue Badge parking",
    counterMode: "parking-accessible",
    releaseDetails: blueBadgeDetails,
    capacity: config.manifest.blueBadgeReserve,
    allocationCount: soldCount(blueBadgeDetails),
    remaining: blueBadgeRemaining,
    soldOut: releaseGroupSoldOut(blueBadgeDetails) || blueBadgeRemaining <= 0 || Boolean(parkingActivity?.sold_out)
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
