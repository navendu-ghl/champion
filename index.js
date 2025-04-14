const functions = require('@google-cloud/functions-framework');
const ClickUpService = require('./services/clickupService');
const AutomationManager = require('./automation-manager');
const ConfigManager = require('./config/config-manager');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.all('/run', handleRun);

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});

async function handleRun(req, res) {
    // const taskId = '86cyh3nxk';
    // const action = 'handle-spillover-task'
    const taskId = req.query?.taskId;
    const action = req.query?.action;
    if (!taskId || !action) {
        res.status(400).send("Clickup taskId and action are required.");
        return;
    }

    let results = [];
    try {
        const clickupService = new ClickUpService();

        const task = await clickupService.getTaskDetailsV2(taskId);
        // console.log({ task: JSON.stringify(task, null, 2) });
        const configManager = new ConfigManager(task);
        configManager.enableAutomation(action);
        const automationManager = new AutomationManager(configManager.getConfig());

        let { results, errors } = await automationManager.runAutomations(task);
        console.log('Automation results:', results);
        if (errors.length > 0) {
            console.error('Automation errors:', errors);
        }
    } catch (error) {
        console.error('Error running automations:', error.message);
    }

    res.send('Automation results:', results);
}

// functions.http('run', handleRun);

// handleRun()
