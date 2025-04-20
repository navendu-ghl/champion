const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const ClickUpHelper = require("../clickup-helper");

class CreateSubTasksAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
  }

  async run(task) {
    try {
      const createSubTasksAction = this.config.id === "create-sub-tasks";

      if (!createSubTasksAction) {
        throw new Error("No create-sub-tasks action found in config");
      }

      const subTaskCategories = this.config.then.data.subTaskCategories;
      const customFieldsToCopy = this.config.metadata.customFieldsToCopy;
      const clickUpHelper = new ClickUpHelper(task.custom_fields);
      const customFields = clickUpHelper.copyCustomFields(task, customFieldsToCopy);

      const subTasksData = subTaskCategories.map((category) => {
        return {
          name: `[${category}] ${task.name}`,
          parent: task.id,
          custom_fields: customFields.map((field) => ({
            id: field.key,
            value: field.value,
          })),
        };
      });

      const subTasks = await Promise.all(subTasksData.map((subTask) => this.clickupService.createTask(task.list.id, subTask)));
      // console.log({ subTasks: JSON.stringify(subTasksData, null, 2) });
    } catch (error) {
      console.error("Error adding custom fields:", error);
      throw error;
    }
  }
}

module.exports = CreateSubTasksAutomation;
