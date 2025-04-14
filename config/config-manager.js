const ClickUpHelper = require('../clickup-helper');
const teams = require('../data/teams.json');

class ConfigManager {
    constructor(task) {
        this.task = task;
        this.customFields = task.custom_fields;

        // maintain order
        this.clickUpHelper = new ClickUpHelper();
        this.config = this.compileConfig();
        // maintain order
    }

    compileConfig() {
        if (!this.clickUpHelper) throw new Error('ClickUpHelper not found');

        return {
            addDefaultCustomFields: {
                id: "add-default-custom-fields",
                name: "Add Default Custom Fields for Specific Creator",
                automationFile: "add-default-custom-fields",
                enabled: false,
                when: {
                    $or: [
                        { "creator.email": { $in: teams["automation-calendars"].members } }
                    ]
                },
                then: {
                    action: "add_default_custom_fields",
                    data: {
                        customFields: [
                            {
                                key: this.clickUpHelper.getCustomFieldId(this.customFields, "📚 Module"),
                                value: this.clickUpHelper.getCustomFieldOptionId(this.customFields, "📚 Module", "Automation")
                            },
                            {
                                key: this.clickUpHelper.getCustomFieldId(this.customFields, "📚 Sub-Module"),
                                value: this.clickUpHelper.getCustomFieldOptionId(this.customFields, "📚 Sub-Module", "Auto-Calendar")
                            }
                            // {
                            //     key: this.clickUpHelper.getCustomFieldId(this.customFields, "⏳ Delivery Quarter"),
                            //     value: this.clickUpHelper.getCustomFieldOptionId(this.customFields, "⏳ Delivery Quarter", this.clickUpHelper.getCurrentQuarter(this.customFields))
                            // }
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
                then: {
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
                        { "creator.email": { $in: teams["automation-calendars"].members } }
                    ]
                },
                then: {
                    action: "copy_properties_from_parent_task",
                    data: {}
                }
            },
            createSubTasks: {
                id: "create-sub-tasks",
                name: "Create Sub Tasks",
                automationFile: "create-sub-tasks",
                enabled: false,
                when: {
                    $and: [
                        { "custom_item_id": { $eq: this.clickUpHelper.getCustomItemId("User Story") } },
                        { "creator.email": { $in: teams["automation-calendars"].members } }
                    ]
                },
                then: {
                    action: "create_sub_tasks",
                    data: {
                        subTaskCategories: ['DEV', 'QA', 'Product Review']
                    }
                }
            },
            handleSpilloverTask: {
                id: "handle-spillover-task",
                name: "Handle Spillover Task",
                automationFile: "handle-spillover-task",
                enabled: false,
                when: {
                    $and: [
                        { "custom_item_id": { $eq: this.clickUpHelper.getCustomItemId("User Story") } },
                        { "creator.email": { $in: teams["automation-calendars"].members } },
                        { "tags[].name": { $includes: "spillover" } }
                    ]
                },
                then: {
                    action: "handle-spillover-task",
                    data: {}
                }
            }
        };
    }

    getConfig() {
        return this.config;
    }

    getAutomationById(id) {
        return Object.values(this.config).find(automation => automation.id === id);
    }

    enableAutomation(id) {
        const automation = this.getAutomationById(id);
        if (automation) {
            automation.enabled = true;
        }
    }

    disableAutomation(id) {
        const automation = this.getAutomationById(id);
        if (automation) {
            automation.enabled = false;
        }
    }
}

module.exports = ConfigManager;
