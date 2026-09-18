import { MANIFEST_2026 } from "./manifest-2026.mjs";
import { INTEGRATION_CONFIG_2026 } from "./integration-config-2026.mjs";

const cleanUrl = (value) => String(value || "").replace(/\/+$/, "");
const isProduction = () => process.env.CONTEXT === "production";

export function deploymentMode() {
  return isProduction() ? "live" : "test";
}

export function getConfig() {
  const mode = deploymentMode();
  const integration = INTEGRATION_CONFIG_2026;
  const live = integration.tito.live;

  return {
    manifest: MANIFEST_2026,
    mode,
    isProduction: mode === "live",
    automationEnabled: integration.features.automationEnabled,
    postPurchaseEnabled: integration.features.postPurchaseEnabled,
    customConfirmationEnabled: integration.features.customConfirmationEnabled,
    meetAndGreetEnabled: integration.features.meetAndGreetEnabled,
    siteUrl: cleanUrl(
      process.env.DEPLOY_PRIME_URL ||
      process.env.URL ||
      "https://wotton-firework-display.co.uk"
    ),
    tito: {
      // Deliberately conservative: only Netlify's production context can ever
      // select the live token. Every preview/branch/local deploy uses test.
      apiToken: mode === "live"
        ? (process.env.TITO_API_TOKEN_LIVE || "")
        : (process.env.TITO_API_TOKEN_TEST || ""),
      accountSlug: integration.tito.accountSlug,
      eventSlug: integration.tito.eventSlug,
      webhookSecurityToken: process.env.TITO_WEBHOOK_SECURITY_TOKEN || "",
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
      },
      checkinListSlug: live.checkinListSlug
    },
    groupQrSecret: process.env.GROUP_QR_SECRET || "",
    gateStaffKey: process.env.GATE_STAFF_KEY || "",
    email: {
      deliveryUrl: cleanUrl(process.env.EMAIL_DELIVERY_URL || ""),
      deliveryToken: process.env.EMAIL_DELIVERY_TOKEN || "",
      from: process.env.EMAIL_FROM || `Wotton Firework Display <${integration.contact.email}>`
    },
    meetAndGreet: {
      eventSlug: integration.tito.meetAndGreet.eventSlug,
      releaseId: integration.tito.meetAndGreet.releaseId
    }
  };
}

export function configurationStatus(config = getConfig()) {
  const tokenName = config.isProduction ? "TITO_API_TOKEN_LIVE" : "TITO_API_TOKEN_TEST";
  const requiredForApi = [[tokenName, config.tito.apiToken]];
  const requiredForAutomation = [
    ...requiredForApi,
    ["live.superSaverActivityId", config.tito.activities.superSaver],
    ["live.advanceActivityId", config.tito.activities.advance],
    ["live.superSaverReleases", config.tito.releases.superSaver.length],
    ["live.advanceReleases", config.tito.releases.advance.length],
    ["live.standardReleases", config.tito.releases.standard.length],
    ["live.preschoolRelease", config.tito.releases.preschool]
  ];
  const requiredForWebhook = [["TITO_WEBHOOK_SECURITY_TOKEN", config.tito.webhookSecurityToken]];
  const requiredForGroupQr = [
    ["GROUP_QR_SECRET", config.groupQrSecret],
    ["live.checkinListSlug", config.tito.checkinListSlug],
    ["GATE_STAFF_KEY", config.gateStaffKey]
  ];
  const requiredForEmail = [
    ["EMAIL_DELIVERY_URL", config.email.deliveryUrl],
    ["EMAIL_FROM", config.email.from]
  ];
  const missing = (items) => items.filter(([, value]) => !value).map(([key]) => key);
  return {
    api: missing(requiredForApi),
    automation: missing(requiredForAutomation),
    webhook: missing(requiredForWebhook),
    groupQr: missing(requiredForGroupQr),
    email: missing(requiredForEmail)
  };
}
