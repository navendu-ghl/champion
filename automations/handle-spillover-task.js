const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const ClickUpHelper = require("../clickup-helper");

class HandleSpilloverTaskAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "handle-spillover-task";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run handle-spillover-task");
      }

      const task = context.getTask();

      const taskWithSubtasks = await this.clickupService.getTaskDetailsV2(task.id, true);
      const subtaskIds = taskWithSubtasks.subtasks.map((subtask) => subtask.id);

      // Duplicate the task
      const customFieldsToCopy = ["📚 Module", "📚 Sub-Module", "📖 Category"];
      const clickUpHelper = new ClickUpHelper();
      const customFields = clickUpHelper.copyCustomFields(task, customFieldsToCopy);
      const duplicateTask = await this.clickupService.duplicateTask(task, {
        name: `[Spillover] ${task.name}`,
        description: task.description,
        parent: task.parent,
        customFields,
      });

      // Copy the comments
      await this.clickupService.copyTaskComments(task.id, duplicateTask.id);

      // Add the "spillover" tag to the duplicate task
      await this.clickupService.addTagToTask(duplicateTask.id, "spillover");

      // Copy the subtasks
      await Promise.all(
        subtaskIds.map(async (subtaskId) => {
          const subtask = await this.clickupService.getTaskDetailsV2(subtaskId);
          const customFieldsToCopy = ["📚 Module", "📚 Sub-Module", "📖 Category"];
          const customFields = clickUpHelper.copyCustomFields(subtask, customFieldsToCopy);

          const duplicateSubtask = await this.clickupService.duplicateTask(subtask, {
            name: `[Spillover] ${subtask.name}`,
            description: subtask.description,
            parent: duplicateTask.id,
            customFields,
          });
          await this.clickupService.copyTaskComments(subtask.id, duplicateSubtask.id);
        })
      );

      // move the task to the next sprint
      const sprints = await this.clickupService.fetchSprintLists();
      const { current, next } = clickUpHelper.getCurrentAndNextSprint(sprints);
      await this.clickupService.addTaskToList(duplicateTask.id, next.id);

      // move the subtasks to the next sprint
      await Promise.all(
        subtaskIds.map(async (subtaskId) => this.clickupService.addTaskToList(subtaskId, next.id))
      );

    } catch (error) {
      console.error("Error handling spillover task:", error);
      throw error;
    }
  }
}

module.exports = HandleSpilloverTaskAutomation;
