const config = {
    postWeeklyReleaseDigest: {
        id: "post-weekly-release-digest",
        name: "Post Weekly Release Digest",
        automationFile: "post-weekly-release-digest",
        enabled: false,
        metadata: {
            manualActionCount: 0
        },
        when: {},
        then: {
            action: "post_weekly_release_digest",
            data: {}
        }
    }
};

module.exports = config;