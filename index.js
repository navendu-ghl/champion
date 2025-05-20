const ClickUpService = require('./services/clickupService');
const AutomationManager = require('./automation-manager');
const ConfigManager = require('./config/config-manager');
const { TaskAutomationContext, GeneralAutomationContext } = require('./config/automation-context');
const generalAutomationConfig = require('./config/general-automation-config');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.all('/run', handleTaskAutomation);

app.all('/general', handleGeneralAutomation);

app.all('/slack/interaction', handleSlackInteraction);

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});

async function handleTaskAutomation(req, res) {
    const { taskId, action } = req.query;
    // const taskId = '86cygabpu';
    // const action = 'create-sub-tasks';
    if (!taskId || !action) {
        console.error("Task ID and action are required for task automation");
        res.status(400).send('Task ID and action are required for task automation');
        return;
    }

    try {
        const clickupService = new ClickUpService();
        const task = await clickupService.getTaskDetailsV2(taskId);
        const context = new TaskAutomationContext(task);
        const results = await runAutomation(context, action);
        console.log(results);
        res.status(200).send(`Automation run successfully`);
        return;
    } catch (error) {
        console.error('Error running task automation:', error.message);
        res.status(500).send('Error running task automation');
        return;
    }
}

// TODO: return 
async function handleGeneralAutomation(req, res) {
    const action = req.query.action;
    const team = req.query.team;
    const mode = req.query.mode;
    const config = generalAutomationConfig;

    Object.values(config).forEach(automation => {
        automation.then.data.mode = mode || 'review';
        automation.then.data.team = team;
    });

    if (!action || !team) {
        console.error("Action and team are required for general automation");
        return;
    }

    try {
        const context = new GeneralAutomationContext(config);
        return runAutomation(context, action);
    } catch (error) {
        console.error('Error running general automation:', error.message);
        return;
    }
}

async function handleSlackInteraction(req, res) {
    const payload = JSON.parse(req.body.payload);
    const action = payload.actions?.[0];
    // const user = payload.user.username;
    const actionId = action?.action_id;

    switch (actionId) {
        case 're-generate-release-digest':
            console.log("Re-generating release digest");
            handleGeneralAutomation({ query: { action: 'post-weekly-release-digest', mode: 'review' } });
            break;
        case 'publish-release-digest':
            console.log("Publishing release digest");
            handleGeneralAutomation({ query: { action: 'post-weekly-release-digest', mode: 'publish' } });
            break;
    }

    res.send('Done');
}

async function runAutomation(context, action) {
    console.log("Running automation", action);
    const configManager = new ConfigManager(context);
    configManager.enableAutomation(action);
    const automationManager = new AutomationManager(configManager.getConfig());
    return automationManager.runAutomations(context);
}

// handleTaskAutomation()
// handleGeneralAutomation('post-weekly-release-digest')