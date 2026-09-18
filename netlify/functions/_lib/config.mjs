import { MANIFEST_2026 } from "./manifest-2026.mjs";

const yes = (value) => String(value || "").toLowerCase() === "true";
const csv = (value) => String(value || "").split(",").map((v) => v.trim()).filter(Boolean);
const cleanUrl = (value) => String(value || "").replace(/\/+$/, "");

export function getConfig() {
  return {
    manifest: MANIFEST_2026,
    automationEnabled: yes(process.env.FIREWORKS_AUTOMATION_ENABLED),
    postPurchaseEnabled: yes(process.env.POST_PURCHASE_ENABLED),
    customConfirmationEnabled: yes(process.env.CUSTOM_CONFIRMATION_ENABLED),
    meetAndGreetEnabled: yes(process.env.MEET_AND_GREET_ENABLED),
    siteUrl: cleanUrl(process.env.SITE_URL || process.env.URL || "https://wotton-firework-display.co.uk"),
    tito: {
      apiToken: process.env.TITO_API_TOKEN || "",
      accountSlug: process.env.TITO_ACCOUNT_SLUG || "wotton-firework-display",
      eventSlug: process.env.TITO_EVENT_SLUG || "2026",
      webhookSecurityToken: process.env.TITO_WEBHOOK_SECURITY_TOKEN || "",
      releases: {
        superSaver: csv(process.env.TITO_SUPER_SAVER_RELEASES),
        advance: csv(process.env.TITO_ADVANCE_RELEASES),
        standard: csv(process.env.TITO_STANDARD_RELEASES),
        preschool: process.env.TITO_PRESCHOOL_RELEASE || "",
        paidParking: process.env.TITO_PAID_PARKING_RELEASE || "",
        blueBadgeParking: process.env.TITO_BLUE_BADGE_PARKING_RELEASE || "",
        complimentaryAdmission: process.env.TITO_COMPLIMENTARY_ADMISSION_RELEASE || "",
        complimentaryParking: process.env.TITO_COMPLIMENTARY_PARKING_RELEASE || ""
      },
      activities: {
        eventCapacity: process.env.TITO_EVENT_CAPACITY_ACTIVITY_ID || "",
        superSaver: process.env.TITO_SUPER_SAVER_ACTIVITY_ID || "",
        advance: process.env.TITO_ADVANCE_ACTIVITY_ID || "",
        parkingCapacity: process.env.TITO_PARKING_CAPACITY_ACTIVITY_ID || "",
        generalParking: process.env.TITO_GENERAL_PARKING_ACTIVITY_ID || ""
      },
      checkinListSlug: process.env.TITO_CHECKIN_LIST_SLUG || ""
    },
    groupQrSecret: process.env.GROUP_QR_SECRET || "",
    gateStaffKey: process.env.GATE_STAFF_KEY || "",
    email: {
      deliveryUrl: cleanUrl(process.env.EMAIL_DELIVERY_URL || ""),
      deliveryToken: process.env.EMAIL_DELIVERY_TOKEN || "",
      from: process.env.EMAIL_FROM || ""
    },
    meetAndGreet: {
      eventSlug: process.env.MEET_AND_GREET_TITO_EVENT_SLUG || "",
      releaseId: process.env.MEET_AND_GREET_RELEASE_ID || ""
    }
  };
}

export function configurationStatus(config = getConfig()) {
  const requiredForApi = [
    ["TITO_API_TOKEN", config.tito.apiToken],
    ["TITO_ACCOUNT_SLUG", config.tito.accountSlug],
    ["TITO_EVENT_SLUG", config.tito.eventSlug]
  ];
  const requiredForAutomation = [
    ...requiredForApi,
    ["TITO_SUPER_SAVER_ACTIVITY_ID", config.tito.activities.superSaver],
    ["TITO_ADVANCE_ACTIVITY_ID", config.tito.activities.advance],
    ["TITO_SUPER_SAVER_RELEASES", config.tito.releases.superSaver.length],
    ["TITO_ADVANCE_RELEASES", config.tito.releases.advance.length],
    ["TITO_STANDARD_RELEASES", config.tito.releases.standard.length],
    ["TITO_PRESCHOOL_RELEASE", config.tito.releases.preschool]
  ];
  const requiredForWebhook = [["TITO_WEBHOOK_SECURITY_TOKEN", config.tito.webhookSecurityToken]];
  const requiredForGroupQr = [
    ["GROUP_QR_SECRET", config.groupQrSecret],
    ["TITO_CHECKIN_LIST_SLUG", config.tito.checkinListSlug],
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
