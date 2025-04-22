const AutomationBase = require('../automation-base');
const ClickUpService = require('../services/clickupService');
const ClickUpHelper = require('../clickup-helper');

class CopyPropertiesFromParentTaskAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === 'copy-properties-from-parent-task';

      if (!isCorrectAutomation) {
        throw new Error('Not configured to run copy-properties-from-parent-task');
      }

      const task = context.getTask();

      const parentTask = await this.clickupService.getTaskDetailsV2(task.parent);

      // copy custom fields from parent task
      const customFieldsToCopy = this.config.then.data.customFieldsToCopy;
      const clickUpHelper = new ClickUpHelper(task.custom_fields);
      const customFields = clickUpHelper.copyCustomFields(parentTask, customFieldsToCopy);

      await Promise.all(
        customFields.map(async (customField) => {
          return this.clickupService.setCustomFields(task.id, customField.key, customField.value);
        })
      );

      console.log('Custom fields added successfully');
    } catch (error) {
      console.error('Error adding custom fields:', error);
      throw error;
    }
  }
}

module.exports = CopyPropertiesFromParentTaskAutomation;
