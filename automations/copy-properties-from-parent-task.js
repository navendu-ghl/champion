const AutomationBase = require('../automation-base');
const ClickUpService = require('../services/clickupService');
const ClickUpHelper = require('../clickup-helper');

class CopyPropertiesFromParentTaskAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
  }

  async run(task) {
    try {
      const copyPropertiesFromParentTaskAction = this.config.id === 'copy-properties-from-parent-task';

      if (!copyPropertiesFromParentTaskAction) {
        throw new Error('No copy-properties-from-parent-task action found in config');
      }

      const parentTask = await this.clickupService.getTaskDetailsV2(task.parent);

      // copy custom fields from parent task
      const customFieldsToCopy = this.config.metadata.customFieldsToCopy;
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
