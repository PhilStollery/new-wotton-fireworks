import { DateTime } from "luxon";
import { getConfig } from "./_lib/config.mjs";
import { getActivity, getActivities, getReleases } from "./_lib/tito.mjs";
import { HttpError, json, toErrorResponse } from "./_lib/http.mjs";

const CACHE_TTL_MS = 10_000;
const UNBOUNDED_LOCAL_REMAINING = 1_000_000;
let cachedPayload = null;
let cachedAt = 0;
let refreshInFlight = null;
let retryAfter = 0;
let lastFailure = null;

export const config = {
  path: "/api/ticket-availability"
};

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function activityId(value) {
  if (value == null) return "";
  if (typeof value === "object") return String(value.id ?? value.activity_id ?? value.activityId ?? value.slug ?? "");
  return String(value);
}

function releaseActivityIds(release) {
  return new Set((Array.isArray(release?.activities) ? release.activities : []).map(activityId).filter(Boolean));
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
    price: Number.isFinite(Number(release?.price)) ? Number(release.price) : null,
    displayPrice: Number.isFinite(Number(release?.display_price ?? release?.displayPrice ?? release?.price))
      ? Number(release?.display_price ?? release?.displayPrice ?? release?.price)
      : null,
    pricingType: release?.pricing_type || release?.payment_type || null,
    description: String(release?.description || ""),
    startAt: release?.start_at || null,
    endAt: release?.end_at || null,
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

function activitySummary({ key, label, activityName, counterMode = "capacity", kind = "admission" }, activity, releaseDetails = null) {
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
    kind,
    capacity,
    allocationCount,
    remaining: remaining == null ? UNBOUNDED_LOCAL_REMAINING : remaining,
    displayRemaining: remaining,
    remainingKnown: remaining != null,
    soldOut: Boolean(activity?.sold_out) || (capacity != null && capacity > 0 && remaining <= 0) || releaseGroupSoldOut(details),
    counterMode,
    releases,
    releaseDetails: details
  };
}

function cappedActivitySummary({ key, label, counterMode = "capacity", kind = "admission" }, activity, releaseDetails, capacity) {
  const details = uniqueReleaseDetails(releaseDetails || activity?.releases || []);
  if (!details.length) throw new HttpError(503, `No ticket releases are attached to ${label}.`);

  const limit = Math.max(0, Number(capacity || 0));
  const activityCount = Number(activity?.allocation_count ?? activity?.allocationCount);
  const allocationCount = Number.isFinite(activityCount) ? Math.max(0, activityCount) : soldCount(details);
  const remaining = Math.max(limit - allocationCount, 0);

  return {
    key,
    label,
    kind,
    capacity: limit,
    allocationCount,
    remaining,
    displayRemaining: remaining,
    remainingKnown: true,
    soldOut: Boolean(activity?.sold_out) || remaining <= 0 || releaseGroupSoldOut(details),
    counterMode,
    releases: details.map((release) => release.slug),
    releaseDetails: details
  };
}

function staticGroup({ key, label, kind = "standalone", counterMode, releaseDetails, soldOut = null, capacity = null, allocationCount = 0, remaining = UNBOUNDED_LOCAL_REMAINING, displayRemaining = null, remainingKnown = false }) {
  const details = uniqueReleaseDetails(releaseDetails || []);
  if (!details.length) return null;
  return {
    key,
    label,
    kind,
    capacity,
    allocationCount,
    remaining,
    displayRemaining,
    remainingKnown,
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
  const title = String(release?.title || release?.name || "");
  const slug = String(release?.slug || "");
  return /\btest\s*wave\b/i.test(`${title} ${slug}`) || /^test[\s_-]/i.test(title) || /^test[\s_-]/i.test(slug);
}

function configuredDetails(configuredSlugs, allReleaseDetails) {
  const configured = new Set((configuredSlugs || []).filter(Boolean).map(String));
  if (!configured.size) return [];
  return allReleaseDetails.filter((release) => configured.has(String(release.slug)));
}

function soldCount(details) {
  return details.reduce((sum, release) => sum + Math.max(0, Number(release.ticketsCount || 0)), 0);
}

function activityName(activity) {
  return String(activity?.name || activity?.title || activity?.slug || "");
}

function activityCapacity(activity) {
  return Number.isFinite(Number(activity?.capacity)) ? Number(activity.capacity) : null;
}

function scoreActivity(activity, { expectedCapacity = null, patterns = [], excludeIds = new Set() } = {}) {
  const id = activityId(activity);
  if (!id || excludeIds.has(id)) return -Infinity;
  const name = normalise(activityName(activity));
  const capacity = activityCapacity(activity);
  let score = 0;

  if (Number.isFinite(Number(expectedCapacity)) && capacity === Number(expectedCapacity)) score += 120;
  if (patterns.some((pattern) => pattern.test(name))) score += 90;
  if (Number.isFinite(Number(expectedCapacity)) && capacity != null && capacity > 0) {
    const ratio = Math.abs(capacity - Number(expectedCapacity)) / Math.max(Number(expectedCapacity), 1);
    score += Math.max(0, 25 - ratio * 25);
  }
  if (/test\s*wave/i.test(name)) score -= 200;
  return score;
}

function findActivity(activities, options = {}) {
  const ranked = (activities || [])
    .map((activity) => ({ activity, score: scoreActivity(activity, options) }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.activity || null;
}

function releasesForActivity(releases, activity) {
  const id = activityId(activity);
  if (!id) return [];
  return releases.filter((release) => releaseActivityIds(release).has(id));
}

function findLinkedActivity(releaseDetails, activities, options = {}, allowGlobalFallback = true) {
  const detailSets = (releaseDetails || [])
    .map(releaseActivityIds)
    .filter((set) => set.size);

  if (detailSets.length) {
    const intersection = new Set(detailSets[0]);
    detailSets.slice(1).forEach((set) => {
      [...intersection].forEach((id) => { if (!set.has(id)) intersection.delete(id); });
    });
    const common = (activities || []).filter((activity) => intersection.has(activityId(activity)));
    const commonMatch = findActivity(common, options);
    if (commonMatch) return commonMatch;

    const union = new Set(detailSets.flatMap((set) => [...set]));
    const linked = (activities || []).filter((activity) => union.has(activityId(activity)));
    const linkedMatch = findActivity(linked, options);
    if (linkedMatch) return linkedMatch;
  }

  return allowGlobalFallback ? findActivity(activities, options) : null;
}

function inferCustomerReleaseGroups(config, allReleaseDetails, activities) {
  const eventActivity = findActivity(activities, {
    expectedCapacity: config.manifest.eventCapacity,
    patterns: [/event.*capacity/, /admission.*capacity/, /overall.*capacity/]
  });
  const parkingActivity = findActivity(activities, {
    expectedCapacity: config.manifest.parkingCapacity,
    patterns: [/#?\s*parking\s*capacity/, /parking.*capacity/]
  });

  let superSaverDetails = configuredDetails(config.tito.releases.superSaver, allReleaseDetails);
  if (!superSaverDetails.length) superSaverDetails = allReleaseDetails.filter(isSuperSaverRelease);

  let advanceDetails = configuredDetails(config.tito.releases.advance, allReleaseDetails);
  if (!advanceDetails.length) advanceDetails = allReleaseDetails.filter(isAdvanceRelease);

  let standardDetails = configuredDetails(config.tito.releases.standard, allReleaseDetails);
  if (!standardDetails.length) standardDetails = allReleaseDetails.filter(isStandardRelease);

  let preschoolDetails = configuredDetails([config.tito.releases.preschool], allReleaseDetails);
  if (!preschoolDetails.length) preschoolDetails = allReleaseDetails.filter(isPreschoolRelease);

  let paidParkingDetails = configuredDetails([config.tito.releases.paidParking], allReleaseDetails);
  if (!paidParkingDetails.length) paidParkingDetails = allReleaseDetails.filter(isPaidParking);

  let blueBadgeDetails = configuredDetails([config.tito.releases.blueBadgeParking], allReleaseDetails);
  if (!blueBadgeDetails.length) blueBadgeDetails = allReleaseDetails.filter(isBlueBadgeParking);

  // If titles are not enough, use the Activities attached to the customer releases.
  const superActivity = superSaverDetails.length
    ? findLinkedActivity(superSaverDetails, activities, {
        expectedCapacity: config.manifest.superSaverCapacity,
        patterns: [/release\s*1/, /super\s*saver/]
      })
    : findActivity(activities, {
        expectedCapacity: config.manifest.superSaverCapacity,
        patterns: [/release\s*1/, /super\s*saver/]
      });

  // Capacity + release attachment are deliberately stronger signals than the
  // Activity label, so an accidentally misnamed 700-ticket Activity is still
  // identified as Advance.
  const advanceActivity = advanceDetails.length
    ? findLinkedActivity(advanceDetails, activities, {
        expectedCapacity: config.manifest.advanceCapacity,
        patterns: [/release\s*2\s*[-–—:]?\s*advance/, /release\s*2/, /\badvance\b/]
      })
    : findActivity(activities, {
        expectedCapacity: config.manifest.advanceCapacity,
        patterns: [/release\s*2\s*[-–—:]?\s*advance/, /release\s*2/, /\badvance\b/]
      });

  const standardActivity = standardDetails.length
    ? findLinkedActivity(standardDetails, activities, {
        patterns: [/release\s*3/, /\bstandard\b/]
      })
    : findActivity(activities, { patterns: [/release\s*3/, /\bstandard\b/] });

  // Fall back to Activity membership if ticket naming is unusual.
  if (!superSaverDetails.length && superActivity) {
    superSaverDetails = releasesForActivity(allReleaseDetails, superActivity)
      .filter((release) => !isPreschoolRelease(release) && !isParkingRelease(release) && !isComplimentaryRelease(release));
  }
  if (!advanceDetails.length && advanceActivity) {
    advanceDetails = releasesForActivity(allReleaseDetails, advanceActivity)
      .filter((release) => !isPreschoolRelease(release) && !isParkingRelease(release) && !isComplimentaryRelease(release));
  }
  if (!standardDetails.length && standardActivity) {
    standardDetails = releasesForActivity(allReleaseDetails, standardActivity)
      .filter((release) => !isPreschoolRelease(release) && !isParkingRelease(release) && !isComplimentaryRelease(release));
  }
  if (!standardDetails.length && eventActivity) {
    const excluded = new Set([
      ...superSaverDetails, ...advanceDetails, ...preschoolDetails,
      ...paidParkingDetails, ...blueBadgeDetails
    ].map((release) => String(release.slug)));
    standardDetails = releasesForActivity(allReleaseDetails, eventActivity)
      .filter((release) => !excluded.has(String(release.slug)) && !isParkingRelease(release) && !isComplimentaryRelease(release));
  }
  if ((!paidParkingDetails.length || !blueBadgeDetails.length) && parkingActivity) {
    const parkingReleases = releasesForActivity(allReleaseDetails, parkingActivity);
    if (!paidParkingDetails.length) paidParkingDetails = parkingReleases.filter(isPaidParking);
    if (!blueBadgeDetails.length) blueBadgeDetails = parkingReleases.filter(isBlueBadgeParking);
  }

  return {
    eventActivity,
    parkingActivity,
    superActivity,
    advanceActivity,
    standardActivity,
    superSaverDetails: uniqueReleaseDetails(superSaverDetails),
    advanceDetails: uniqueReleaseDetails(advanceDetails),
    standardDetails: uniqueReleaseDetails(standardDetails),
    preschoolDetails: uniqueReleaseDetails(preschoolDetails),
    paidParkingDetails: uniqueReleaseDetails(paidParkingDetails),
    blueBadgeDetails: uniqueReleaseDetails(blueBadgeDetails)
  };
}

function fallbackAdmissionWave({ key, label, releaseDetails }) {
  const details = uniqueReleaseDetails(releaseDetails || []);
  if (!details.length) return null;
  return staticGroup({
    key,
    label,
    kind: "admission",
    counterMode: "capacity-unknown",
    releaseDetails: details,
    soldOut: releaseGroupSoldOut(details),
    remaining: UNBOUNDED_LOCAL_REMAINING,
    displayRemaining: null,
    remainingKnown: false
  });
}

function usableWave(wave) {
  if (!wave || wave.soldOut || wave.expired) return false;
  if (wave.remainingKnown === false) return true;
  return Number(wave.remaining || 0) > 0;
}

function attachAdmissionDeadlines(config, waves) {
  const deadlines = {
    "super-saver": config.manifest.superSaverCutoffLocal,
    advance: config.manifest.advanceCutoffLocal,
    standard: config.manifest.admissionCloseLocal
  };
  return (waves || []).map((wave) => wave ? { ...wave, availableUntil: deadlines[wave.key] || null } : wave);
}

function parkingGroups(config, parkingActivity, paidParkingDetails, blueBadgeDetails) {
  const details = uniqueReleaseDetails(paidParkingDetails || [], blueBadgeDetails || []);
  if (!details.length) return { groups: [], summary: null };

  const capacity = Number.isFinite(Number(parkingActivity?.capacity)) && Number(parkingActivity.capacity) > 0
    ? Number(parkingActivity.capacity)
    : Number(config.manifest.parkingCapacity || 150);
  const activityBooked = Number(parkingActivity?.allocation_count ?? parkingActivity?.allocationCount);
  const totalBooked = Number.isFinite(activityBooked) ? Math.max(0, activityBooked) : soldCount(details);
  const totalRemaining = Math.max(capacity - totalBooked, 0);

  const group = staticGroup({
    key: "parking",
    label: "Parking",
    kind: "parking",
    counterMode: "parking-shared",
    releaseDetails: details,
    capacity,
    allocationCount: totalBooked,
    remaining: totalRemaining,
    displayRemaining: totalRemaining,
    remainingKnown: true,
    soldOut: totalRemaining <= 0 || releaseGroupSoldOut(details)
  });

  return {
    groups: group ? [group] : [],
    summary: { capacity, totalBooked, totalRemaining }
  };
}

async function buildTestAvailability(config) {
  // Preview/test mode uses the real customer-facing releases with Tito's
  // test_mode widget. Shared Activities are the authoritative counters.
  const [rawReleases, activities] = await Promise.all([getReleases(), getActivities()]);
  const allReleaseDetails = uniqueReleaseDetails(rawReleases)
    .filter((release) => !release.archived && !isComplimentaryRelease(release) && !isLegacyTestRelease(release));

  const groups = inferCustomerReleaseGroups(config, allReleaseDetails, activities);

  const superSaver = groups.superSaverDetails.length
    ? (groups.superActivity
        ? activitySummary(
            { key: "super-saver", label: "Super Saver", kind: "admission", counterMode: "capacity" },
            groups.superActivity,
            groups.superSaverDetails
          )
        : fallbackAdmissionWave({ key: "super-saver", label: "Super Saver", releaseDetails: groups.superSaverDetails }))
    : null;

  const advance = groups.advanceDetails.length
    ? (groups.advanceActivity
        ? activitySummary(
            { key: "advance", label: "Advance", kind: "admission", counterMode: "capacity" },
            groups.advanceActivity,
            groups.advanceDetails
          )
        : fallbackAdmissionWave({ key: "advance", label: "Advance", releaseDetails: groups.advanceDetails }))
    : null;

  // Standard is deliberately unlimited at release level. Its real limit is the
  // remaining # Event Capacity, so complimentary and pre-school tickets naturally
  // reduce the number of Standard admissions that can still be sold.
  const standard = groups.standardDetails.length
    ? (groups.eventActivity
        ? activitySummary(
            { key: "standard", label: "Standard", kind: "admission", counterMode: "event-capacity" },
            groups.eventActivity,
            groups.standardDetails
          )
        : fallbackAdmissionWave({ key: "standard", label: "Standard", releaseDetails: groups.standardDetails }))
    : null;

  // Preview/test checkout stays usable before the public sales opening time, but
  // price-band closing dates still behave like the live site.
  const zone = config.manifest.timezone;
  const now = DateTime.utc().setZone(zone);
  if (superSaver) superSaver.expired = now >= DateTime.fromISO(config.manifest.superSaverCutoffLocal, { zone });
  if (advance) advance.expired = now >= DateTime.fromISO(config.manifest.advanceCutoffLocal, { zone });
  if (standard) standard.expired = now >= DateTime.fromISO(config.manifest.admissionCloseLocal, { zone });

  const waves = attachAdmissionDeadlines(config, [superSaver, advance, standard].filter(Boolean));
  if (!waves.length) {
    throw new HttpError(503, "No customer admission releases could be identified. Check the on-sale Tito releases and their Activities.");
  }

  const preschool = groups.preschoolDetails.length
    ? staticGroup({
        key: "preschool",
        label: "Everyone attending needs a ticket",
        kind: "standalone",
        counterMode: "ticket-reminder",
        releaseDetails: groups.preschoolDetails,
        soldOut: groups.eventActivity ? Boolean(groups.eventActivity?.sold_out) : releaseGroupSoldOut(groups.preschoolDetails)
      })
    : null;
  if (preschool) preschool.availableUntil = config.manifest.admissionCloseLocal;

  const parking = parkingGroups(config, groups.parkingActivity, groups.paidParkingDetails, groups.blueBadgeDetails);

  return {
    ok: true,
    testMode: true,
    event: `${config.tito.accountSlug}/${config.tito.eventSlug}`,
    currentWave: waves.find(usableWave) || null,
    waves,
    admissionCapacity: groups.eventActivity ? {
      capacity: Number(groups.eventActivity?.capacity ?? config.manifest.eventCapacity ?? 3500),
      allocationCount: Number(groups.eventActivity?.allocation_count ?? groups.eventActivity?.allocationCount ?? 0),
      remaining: Math.max(0, Number(groups.eventActivity?.capacity ?? config.manifest.eventCapacity ?? 3500) - Number(groups.eventActivity?.allocation_count ?? groups.eventActivity?.allocationCount ?? 0))
    } : null,
    parkingGroups: [preschool, ...parking.groups].filter(Boolean),
    parking: parking.summary
  };
}

function requireLiveConfiguration(config) {
  const missing = [];
  const expect = (name, value) => { if (!value || (Array.isArray(value) && !value.length)) missing.push(name); };
  expect("live.eventCapacityActivityId", config.tito.activities.eventCapacity);
  expect("live.superSaverActivityId", config.tito.activities.superSaver);
  expect("live.advanceActivityId", config.tito.activities.advance);
  expect("live.parkingCapacityActivityId", config.tito.activities.parkingCapacity);
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

  const [eventActivity, superSaverActivity, advanceActivity, parkingActivity, rawReleases, activities] = await Promise.all([
    getActivity(config.tito.activities.eventCapacity),
    getActivity(config.tito.activities.superSaver),
    getActivity(config.tito.activities.advance),
    getActivity(config.tito.activities.parkingCapacity),
    getReleases(),
    getActivities()
  ]);
  const allReleaseDetails = uniqueReleaseDetails(rawReleases);

  const zone = config.manifest.timezone;
  const now = DateTime.utc().setZone(zone);
  const salesOpen = DateTime.fromISO(config.manifest.salesOpenLocal, { zone });
  const superSaverCutoff = DateTime.fromISO(config.manifest.superSaverCutoffLocal, { zone });
  const advanceCutoff = DateTime.fromISO(config.manifest.advanceCutoffLocal, { zone });
  const admissionClose = DateTime.fromISO(config.manifest.admissionCloseLocal, { zone });

  const superSaverDetails = pickReleaseDetails(config.tito.releases.superSaver, superSaverActivity, allReleaseDetails);
  const advanceDetails = pickReleaseDetails(config.tito.releases.advance, advanceActivity, allReleaseDetails);
  const standardDetails = configuredDetails(config.tito.releases.standard, allReleaseDetails);
  const standardActivity = findLinkedActivity(standardDetails, activities, { patterns: [/release\s*3/, /\bstandard\b/] }, false);

  const superSaver = activitySummary(
    { key: "super-saver", label: "Super Saver", kind: "admission", counterMode: "capacity" },
    superSaverActivity,
    superSaverDetails
  );
  superSaver.expired = now >= superSaverCutoff;

  const advance = activitySummary(
    { key: "advance", label: "Advance", kind: "admission", counterMode: "capacity" },
    advanceActivity,
    advanceDetails
  );
  advance.expired = now >= advanceCutoff;

  const standard = activitySummary(
    { key: "standard", label: "Standard", kind: "admission", counterMode: "event-capacity" },
    eventActivity,
    standardDetails
  );
  standard.expired = now >= admissionClose;

  const waves = attachAdmissionDeadlines(config, [superSaver, advance, standard].filter(Boolean));
  const currentWave = now < salesOpen || now >= admissionClose ? null : waves.find(usableWave) || null;

  const preschoolDetails = pickReleaseDetails([config.tito.releases.preschool], eventActivity, allReleaseDetails);
  const preschool = staticGroup({
    key: "preschool",
    label: "Everyone attending needs a ticket",
    kind: "standalone",
    counterMode: "ticket-reminder",
    releaseDetails: preschoolDetails,
    soldOut: Boolean(eventActivity?.sold_out) || releaseGroupSoldOut(preschoolDetails)
  });
  if (preschool) preschool.availableUntil = config.manifest.admissionCloseLocal;

  const paidParkingDetails = configuredDetails([config.tito.releases.paidParking], allReleaseDetails);
  const blueBadgeDetails = configuredDetails([config.tito.releases.blueBadgeParking], allReleaseDetails);
  const parking = parkingGroups(config, parkingActivity, paidParkingDetails, blueBadgeDetails);

  return {
    ok: true,
    testMode: false,
    event: `${config.tito.accountSlug}/${config.tito.eventSlug}`,
    salesState: now < salesOpen ? "not_open" : (now >= admissionClose ? "closed" : "open"),
    currentWave,
    waves,
    admissionCapacity: {
      capacity: Number(eventActivity?.capacity ?? config.manifest.eventCapacity ?? 3500),
      allocationCount: Number(eventActivity?.allocation_count ?? eventActivity?.allocationCount ?? 0),
      remaining: Math.max(0, Number(eventActivity?.capacity ?? config.manifest.eventCapacity ?? 3500) - Number(eventActivity?.allocation_count ?? eventActivity?.allocationCount ?? 0))
    },
    parkingGroups: [preschool, ...parking.groups].filter(Boolean),
    parking: parking.summary
  };
}

async function buildAvailabilityPayload(config) {
  const payload = await (config.isProduction ? buildLiveAvailability(config) : buildTestAvailability(config));
  const remaining = payload.admissionCapacity?.remaining;
  if (Number.isFinite(remaining)) {
    for (const group of [...payload.waves, ...payload.parkingGroups.filter(group => group.key === 'preschool')]) {
      group.remaining = Math.min(group.remaining, remaining);
      group.displayRemaining = group.remaining;
      group.remainingKnown = true;
      group.soldOut = group.soldOut || remaining <= 0;
    }
    if (payload.currentWave?.soldOut) payload.currentWave = null;
  }
  return {...payload, fetchedAt: new Date().toISOString(), stale: false};
}

async function cachedAvailabilityPayload(config) {
  const now = Date.now();
  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) return cachedPayload;
  if (now < retryAfter) {
    if (cachedPayload && now - cachedAt < 5 * 60_000) return {...cachedPayload, stale: true};
    throw lastFailure;
  }

  if (!refreshInFlight) {
    refreshInFlight = buildAvailabilityPayload(config)
      .then((payload) => {
        cachedPayload = payload;
        cachedAt = Date.now();
        retryAfter = 0;
        lastFailure = null;
        return payload;
      })
      .catch((error) => {
        lastFailure = error;
        retryAfter = Date.now() + 30_000;
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

export default async (request) => {
  if (request && request.method !== 'GET') return json({ok:false,error:'Method not allowed'},405,{Allow:'GET'});
  try {
    const config = getConfig();
    const payload = await cachedAvailabilityPayload(config);

    return json(payload, 200, {
      "Netlify-CDN-Cache-Control": payload.stale ? "no-store" : "public, durable, s-maxage=10, stale-while-revalidate=30"
    });
  } catch (error) {
    console.error("WFD ticket availability error", error?.status || 500);
    return toErrorResponse(error);
  }
};
