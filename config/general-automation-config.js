const config = {
  postWeeklyReleaseDigest: {
    id: "post-weekly-release-digest",
    name: "Post Weekly Release Digest",
    automationFile: "post-weekly-release-digest",
    enabled: false,
    metadata: {
      manualActionCount: 0,
    },
    when: {},
    then: {
      action: "post_weekly_release_digest",
      data: {},
    },
  },
  postStandupSummary: {
    id: "post-standup-summary",
    name: "Post Standup Summary",
    automationFile: "post-standup-summary",
    enabled: false,
    metadata: {
      manualActionCount: 0,
    },
    when: {},
    then: {
      action: "post_standup_summary",
      data: {},
    },
  },
};

module.exports = config;
