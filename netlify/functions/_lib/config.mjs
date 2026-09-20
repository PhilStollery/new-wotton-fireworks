import { MANIFEST_2026 } from "./manifest-2026.mjs";
import { INTEGRATION_CONFIG_2026 } from "./integration-config-2026.mjs";

const isProduction = () => process.env.CONTEXT === "production";

export function deploymentMode() {
  return "live";
}

export function getConfig() {
  const mode = deploymentMode();
  const integration = INTEGRATION_CONFIG_2026;
  const live = integration.tito.live;

  return {
    manifest: MANIFEST_2026,
    mode,
    isProduction: mode === "live",
    automationEnabled: Boolean(integration.features.priceAutomationEnabled),
    tito: {
      apiToken: mode === "live"
        ? (process.env.TITO_API_TOKEN_LIVE || "")
        : (process.env.TITO_API_TOKEN_TEST || ""),
      accountSlug: integration.tito.accountSlug,
      eventSlug: integration.tito.eventSlug,
      releases: {
        superSaver: [...live.superSaverReleases],
        advance: [...live.advanceReleases],
        standard: [...live.standardReleases],
        preschool: live.preschoolRelease,
        paidParking: live.paidParkingRelease,
        blueBadgeParking: live.blueBadgeParkingRelease,
        complimentaryAdmission: live.complimentaryAdmissionRelease,
        complimentaryParking: live.complimentaryParkingRelease
      },
      activities: {
        eventCapacity: live.eventCapacityActivityId,
        superSaver: live.superSaverActivityId,
        advance: live.advanceActivityId,
        parkingCapacity: live.parkingCapacityActivityId,
        generalParking: live.generalParkingActivityId
      }
    }
  };
}

export function configurationStatus(config = getConfig()) {
  const tokenName = config.isProduction ? "TITO_API_TOKEN_LIVE" : "TITO_API_TOKEN_TEST";
  const requiredForApi = [[tokenName, config.tito.apiToken]];
  const requiredForLiveTicketing = [
    ...requiredForApi,
    ["live.eventCapacityActivityId", config.tito.activities.eventCapacity],
    ["live.superSaverActivityId", config.tito.activities.superSaver],
    ["live.advanceActivityId", config.tito.activities.advance],
    ["live.parkingCapacityActivityId", config.tito.activities.parkingCapacity],
    ["live.superSaverReleases", config.tito.releases.superSaver.length],
    ["live.advanceReleases", config.tito.releases.advance.length],
    ["live.standardReleases", config.tito.releases.standard.length],
    ["live.preschoolRelease", config.tito.releases.preschool],
    ["live.paidParkingRelease", config.tito.releases.paidParking],
    ["live.blueBadgeParkingRelease", config.tito.releases.blueBadgeParking]
  ];
  const requiredForAutomation = [
    ...requiredForApi,
    ["live.superSaverActivityId", config.tito.activities.superSaver],
    ["live.advanceActivityId", config.tito.activities.advance],
    ["live.superSaverReleases", config.tito.releases.superSaver.length],
    ["live.advanceReleases", config.tito.releases.advance.length],
    ["live.standardReleases", config.tito.releases.standard.length],
    ["live.preschoolRelease", config.tito.releases.preschool]
  ];
  const missing = (items) => items.filter(([, value]) => !value).map(([key]) => key);
  return {
    api: missing(requiredForApi),
    liveTicketing: missing(requiredForLiveTicketing),
    automation: missing(requiredForAutomation)
  };
}
