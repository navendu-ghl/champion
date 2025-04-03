const AutomationBase = require('../automation-base');
const ClickUpService = require('../services/clickupService');

class CopyPropertiesFromParentTaskAutomation extends AutomationBase {
    constructor(config) {
        super(config);
        this.name = config.name;
        this.clickupService = new ClickUpService();
    }

    async run(task) {
        try {
            const copyPropertiesFromParentTaskAction = this.config.then.action === 'copy_properties_from_parent_task'

            if (!copyPropertiesFromParentTaskAction) {
                throw new Error('No copy_properties_from_parent_task action found in config');
            }

            const parentTask = await this.clickupService.getTaskDetailsV2(task.parent);

            // copy task properties from parent task
            await this.clickupService.updateTask(task.id, {
                priority: parentTask.priority.id,
            });

            // copy custom fields from parent task
            const customFieldsToCopy = ['📚 Module', '📚 Sub-Module', '📖 Category'];
            const customFields = this.clickupService.getCustomFields(parentTask, customFieldsToCopy);
            console.log({ customFields: JSON.stringify(customFields, null, 2) });

            await Promise.all(customFields.map(async (customField) => {
                return this.clickupService.setCustomFields(task.id, customField.key, customField.value);
            }));

            console.log('Custom fields added successfully');
        } catch (error) {
            console.error('Error adding custom fields:', error);
            throw error;
        }
    }
}

module.exports = CopyPropertiesFromParentTaskAutomation;
