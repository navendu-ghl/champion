const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");

class AddTagsAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.team = config.then.data.team;
    this.clickupService = new ClickUpService({ team: this.team });
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "add-tags";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run add-tags");
      }

      const task = context.getTask();

      const productReviewRegex = /products?\s*review/i;
      if (productReviewRegex.test(task.name)) {
        await this.clickupService.addTagToTask(task.id, "product review");
      }
      
      // Add the "requirement change" tag to the task
      const requirementChangeRegex = /requirements?\s*change/i;
      if (requirementChangeRegex.test(task.name)) {
        await this.clickupService.addTagToTask(task.id, "requirement change");
      }

      console.log("Tags added successfully");
      
    } catch (error) {
      console.error("Error adding tags:", error);
      throw error;
    }
  }
}

module.exports = AddTagsAutomation;
