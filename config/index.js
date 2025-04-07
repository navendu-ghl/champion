const { getCustomFieldId, getCustomFieldOptionId } = require('./config-helper');

module.exports = {
    addCustomFields: {
        id: "add-custom-fields",
        name: "Add Custom Fields for Specific Creator",
        automationFile: "add-custom-fields",
        enabled: false,
        when: {
            $or: [
                { "creator.email": { $eq: "navendu.duari@gohighlevel.com" } }
            ]
        },
        then:
        {
            action: "add_custom_fields",
            data: {
                customFields: [
                    {
                        key: getCustomFieldId("📚 Module"),
                        value: getCustomFieldOptionId("📚 Module", "Automation")
                    },
                    {
                        key: getCustomFieldId("📚 Sub-Module"),
                        value: getCustomFieldOptionId("📚 Sub-Module", "Auto-Calendar")
                    }
                ]
            }
        }
    },
    generateReleaseNote: {
        id: "generate-release-note",
        name: "Generate Release Note",
        automationFile: "generate-release-note",
        enabled: false,
        when: {
            $or: [{ "tags[].name": { $includes: "calendars-feature-released" } }]
        },
        then:
        {
            action: "generate_release_note",
            data: {}
        }
    },
    copyPropertiesFromParentTask: {
        id: "copy-properties-from-parent-task",
        name: "Copy Properties From Parent Task",
        automationFile: "copy-properties-from-parent-task",
        enabled: false,
        when: {
            $and: [
                { "parent": { $exists: true } },
                { "creator.email": { $eq: "navendu.duari@gohighlevel.com" } }
            ]
        },
        then: {
            action: "copy_properties_from_parent_task",
            data: {}
        }
    }
};
