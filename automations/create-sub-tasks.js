const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const ClickUpHelper = require("../clickup-helper");

class CreateSubTasksAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.team = config.then.data.team;
    this.clickupService = new ClickUpService({ team: this.team });
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "create-sub-tasks";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run create-sub-tasks");
      }

      const task = context.getTask();

      const subTaskCategories = this.config.then.data.subTaskCategories;
      const customFieldsToCopy = this.config.then.data.customFieldsToCopy;
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
          custom_item_id: null, // task type Task
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
