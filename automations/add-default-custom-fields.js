const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");

class AddCustomFieldsAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.team = config.then.data.team;
    this.clickupService = new ClickUpService({ team: this.team });
  }

  async run(context) {
    try {
      // Get the update_custom_fields action from the then clause
      const isCorrectAutomation = this.config.automationFile === "add-default-custom-fields";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run add-default-custom-fields");
      }

      const task = context.getTask();

      // Transform the fields object into the format expected by ClickUp
      const customFields = this.config.then.data.customFields;

      await Promise.all(
        customFields.map(async (customField) => {
          return this.clickupService.setCustomFields(task.id, customField.key, customField.value);
        })
      );

      console.log("Custom fields added successfully");
    } catch (error) {
      console.error("Error adding custom fields:", error);
      throw error;
    }
  }
}

module.exports = AddCustomFieldsAutomation;
