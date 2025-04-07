const AutomationBase = require('../automation-base');
const ClickUpService = require('../services/clickupService');

class AddCustomFieldsAutomation extends AutomationBase {
    constructor(config) {
        super(config);
        this.name = config.name;
        this.clickupService = new ClickUpService();
    }

    async run(task) {
        try {
            // Get the update_custom_fields action from the then clause
            const customFieldsAction = this.config.then.action === 'add_custom_fields'

            if (!customFieldsAction) {
                throw new Error('No add_custom_fields action found in config');
            }

            // Transform the fields object into the format expected by ClickUp
            const customFields = customFieldsAction.data.customFields

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

module.exports = AddCustomFieldsAutomation;
