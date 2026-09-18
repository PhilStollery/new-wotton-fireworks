import { DateTime } from "luxon";
import { getConfig, configurationStatus } from "./config.mjs";
import { getActivity, getRelease, patchRelease } from "./tito.mjs";

function local(iso, config) {
  return DateTime.fromISO(iso, { zone: config.manifest.timezone });
}

async function closeRelease(slug, nowIso) {
  const release = await getRelease(slug);
  const changes = {};
  if (release.state_name !== "off_sale" && release.state !== "off_sale" && release.state !== 404) changes.state = "off_sale";
  if (!release.end_at || DateTime.fromISO(release.end_at) > DateTime.fromISO(nowIso)) changes.end_at = nowIso;
  if (!Object.keys(changes).length) return { slug, changed: false };
  await patchRelease(slug, changes);
  return { slug, changed: true, changes };
}

async function openRelease(slug, nowIso) {
  const release = await getRelease(slug);
  const changes = {};
  if (release.state_name !== "on_sale" && release.state !== "on_sale" && release.state !== 100) changes.state = "on_sale";
  if (release.start_at && DateTime.fromISO(release.start_at) > DateTime.fromISO(nowIso)) changes.start_at = nowIso;
  if (!Object.keys(changes).length) return { slug, changed: false };
  await patchRelease(slug, changes);
  return { slug, changed: true, changes };
}

async function applyGroup(slugs, operation, nowIso) {
  const results = [];
  for (const slug of slugs) results.push(await operation(slug, nowIso));
  return results;
}

export async function reconcilePriceBands({ mutate = true, now = DateTime.utc() } = {}) {
  const config = getConfig();
  const missing = configurationStatus(config).automation;
  if (missing.length) return { ok: false, skipped: "missing_configuration", missing };

  const saleOpen = local(config.manifest.salesOpenLocal, config);
  const ssCutoff = local(config.manifest.superSaverCutoffLocal, config);
  const advCutoff = local(config.manifest.advanceCutoffLocal, config);
  const close = local(config.manifest.admissionCloseLocal, config);
  const zonedNow = now.setZone(config.manifest.timezone);

  const [ssActivity, advActivity] = await Promise.all([
    getActivity(config.tito.activities.superSaver),
    getActivity(config.tito.activities.advance)
  ]);
  const ssCount = Number(ssActivity?.allocation_count || 0);
  const advCount = Number(advActivity?.allocation_count || 0);

  let phase = "not_open";
  if (zonedNow >= close) phase = "closed";
  else if (zonedNow < saleOpen) phase = "not_open";
  else if (zonedNow < ssCutoff && ssCount < config.manifest.superSaverCapacity) phase = "super_saver";
  else if (zonedNow < advCutoff && advCount < config.manifest.advanceCapacity) phase = "advance";
  else phase = "standard";

  const summary = {
    ok: true,
    mutate,
    phase,
    now: zonedNow.toISO(),
    counts: { superSaver: ssCount, advance: advCount },
    changes: []
  };
  if (!mutate || phase === "not_open") return summary;

  const nowIso = zonedNow.toUTC().toISO();
  if (phase === "advance") {
    summary.changes.push(...await applyGroup(config.tito.releases.superSaver, closeRelease, nowIso));
    summary.changes.push(...await applyGroup(config.tito.releases.advance, openRelease, nowIso));
  } else if (phase === "standard") {
    summary.changes.push(...await applyGroup(config.tito.releases.superSaver, closeRelease, nowIso));
    summary.changes.push(...await applyGroup(config.tito.releases.advance, closeRelease, nowIso));
    summary.changes.push(...await applyGroup(config.tito.releases.standard, openRelease, nowIso));
  } else if (phase === "closed") {
    summary.changes.push(...await applyGroup(config.tito.releases.superSaver, closeRelease, nowIso));
    summary.changes.push(...await applyGroup(config.tito.releases.advance, closeRelease, nowIso));
    summary.changes.push(...await applyGroup(config.tito.releases.standard, closeRelease, nowIso));
    if (config.tito.releases.preschool) summary.changes.push(await closeRelease(config.tito.releases.preschool, nowIso));
  }
  return summary;
}
