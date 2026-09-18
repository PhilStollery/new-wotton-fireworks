// Wotton Firework Display 2026 integration configuration.
//
// This file is intentionally committed to Git. It contains operational settings,
// Tito IDs/slugs and feature switches, but no secret credentials.
//
// Netlify only needs two Tito secrets:
//   TITO_API_TOKEN_TEST  - used by every non-production deploy
//   TITO_API_TOKEN_LIVE  - used only when CONTEXT === "production"

export const INTEGRATION_CONFIG_2026 = Object.freeze({
  contact: Object.freeze({
    email: "help@wotton-firework-display.co.uk",
    facebookUrl: "https://www.facebook.com/wotton.fireworks"
  }),

  features: Object.freeze({
    automationEnabled: false,
    postPurchaseEnabled: false,
    customConfirmationEnabled: false,
    meetAndGreetEnabled: false
  }),

  tito: Object.freeze({
    accountSlug: "wotton-firework-display",
    eventSlug: "2026",

    // Deploy Previews, branch deploys and local development always use this block.
    // Fill in the Activity IDs and release slugs from the controlled Tito test setup.
    test: Object.freeze({
      waves: Object.freeze([
        Object.freeze({
          key: "wave-1",
          label: "Test Wave One",
          activityId: "",
          releases: Object.freeze([])
        }),
        Object.freeze({
          key: "wave-2",
          label: "Test Wave Two",
          activityId: "",
          releases: Object.freeze([])
        })
      ])
    }),

    // Production uses this block. These can be filled in before launch without
    // needing any Netlify settings changed.
    live: Object.freeze({
      eventCapacityActivityId: "",
      superSaverActivityId: "",
      advanceActivityId: "",
      parkingCapacityActivityId: "",
      generalParkingActivityId: "",
      superSaverReleases: Object.freeze([]),
      advanceReleases: Object.freeze([]),
      standardReleases: Object.freeze([]),
      preschoolRelease: "",
      paidParkingRelease: "",
      blueBadgeParkingRelease: "",
      complimentaryAdmissionRelease: "",
      complimentaryParkingRelease: "",
      checkinListSlug: ""
    }),

    // Optional separate follow-up event. Leave blank/disabled until used.
    meetAndGreet: Object.freeze({
      eventSlug: "",
      releaseId: ""
    })
  })
});
