const functions = require('@google-cloud/functions-framework');
const ClickUpService = require('./services/clickupService');
const AutomationManager = require('./automation-manager');
const ConfigManager = require('./config/config-manager');

async function handleRun(req, res) {
    const taskId = '86cyfy91q';
    const action = 'create-sub-tasks'
    if (!taskId || !action) {
        res.status(400).send("Clickup taskId and action are required.");
    }


    try {
        const clickupService = new ClickUpService();

        const task = await clickupService.getTaskDetailsV2(taskId);
        // console.log({ task: JSON.stringify(task, null, 2) });
        const configManager = new ConfigManager(task);
        configManager.enableAutomation(action);
        const automationManager = new AutomationManager(configManager.getConfig());

        const { results, errors } = await automationManager.runAutomations(task);
        console.log('Automation results:', results);
        if (errors.length > 0) {
            console.error('Automation errors:', errors);
        }
    } catch (error) {
        console.error('Error running automations:', error);
    }
}

// functions.http('run', handleRun);

handleRun()
