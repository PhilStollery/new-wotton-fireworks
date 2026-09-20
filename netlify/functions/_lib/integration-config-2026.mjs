// Wotton Firework Display 2026 integration configuration.
//
// This file is deliberately committed to Git. It contains operational settings,
// Tito names/IDs/slugs and feature switches, but no credentials.
//
// Netlify only needs two secrets:
//   TITO_API_TOKEN_TEST  - test-mode Tito token, used by every non-production deploy
//   TITO_API_TOKEN_LIVE  - live Tito token, used only by Netlify production

export const INTEGRATION_CONFIG_2026 = Object.freeze({
  features: Object.freeze({
    // Keep false until the Super Saver -> Advance -> Standard transition logic
    // has passed controlled testing. Change it here, not in Netlify.
    priceAutomationEnabled: false
  }),

  tito: Object.freeze({
    accountSlug: "wotton-firework-display",
    eventSlug: "2026",

    // Test-mode Activities are resolved by name through the Tito Admin API.
    // Their attached releases are discovered automatically, so no test IDs or
    // release slugs need to be copied into Netlify or this file.
    test: Object.freeze({
      waves: Object.freeze([
        Object.freeze({ key: "wave-1", label: "Test Wave One", activityName: "Test Wave One" }),
        Object.freeze({ key: "wave-2", label: "Test Wave Two", activityName: "Test Wave Two" })
      ])
    }),

    // Production values are ordinary configuration and can be committed here.
    // Confirmed from the live Tito 2026 event on 20 September 2026.
    live: Object.freeze({
      eventCapacityActivityId: "1102976",
      superSaverActivityId: "1102977",
      advanceActivityId: "1102978",
      parkingCapacityActivityId: "1102979",

      // No separate general-parking Activity is present in Tito. Public paid and
      // Blue Badge parking both use the shared # Parking Capacity Activity.
      generalParkingActivityId: "",

      superSaverReleases: Object.freeze([
        "cygycwzul7i",
        "super-saver-secondary-sixth-form",
        "rtnncvh9uya"
      ]),
      advanceReleases: Object.freeze([
        "advance-primary-school-age",
        "advance-secondary-sixth-form",
        "advance-adult"
      ]),
      standardReleases: Object.freeze([
        "child-ticket",
        "standard-secondary-sixth-form",
        "adult-ticket"
      ]),
      preschoolRelease: "pre-school-free",
      paidParkingRelease: "parking",
      blueBadgeParkingRelease: "blue-badge-parking",
      complimentaryAdmissionRelease: "complimentary",
      complimentaryParkingRelease: "complimentary-parking"
    })
  })
});
