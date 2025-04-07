const AutomationBase = require('../automation-base');
const ClickUpService = require('../services/clickupService');
const ClickUpHelper = require('../clickup-helper');

class HandleSpilloverTaskAutomation extends AutomationBase {
    constructor(config) {
        super(config);
        this.name = config.name;
        this.clickupService = new ClickUpService();
    }

    async run(task) {
        try {
            const handleSpilloverTaskAction = this.config.then.action === 'handle_spillover_task'

            if (!handleSpilloverTaskAction) {
                throw new Error('No handle_spillover_task action found in config');
            }

            const customFieldsToCopy = ['📚 Module', '📚 Sub-Module', '📖 Category'];
            const clickUpHelper = new ClickUpHelper(task.custom_fields);
            const customFields = clickUpHelper.copyCustomFields(task, customFieldsToCopy);

            const duplicateTaskData = {
                name: `[Spillover] ${task.name}`,
                parent: task.parent,
                custom_fields: customFields.map(field => ({
                    id: field.key,
                    value: field.value
                }))
            }

            const duplicateTask = await this.clickupService.createTask(task.list.id, duplicateTaskData);
            // console.log({ subTasks: JSON.stringify(subTasksData, null, 2) });
            // move the task to the next sprint
            const sprints = await this.clickupService.fetchSprints();
            const { current, next } = clickUpHelper.getCurrentAndNextSprint(sprints);
            // console.log({ current, next });
            const response = await this.clickupService.addTaskToList(duplicateTask.id, next.id);
            // console.log({ response });

        } catch (error) {
            console.error('Error handling spillover task:', error);
            throw error;
        }
    }
}

module.exports = HandleSpilloverTaskAutomation;
