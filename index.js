const ClickUpService = require('./services/clickupService');
const AutomationManager = require('./automation-manager');
const ConfigManager = require('./config/config-manager');
const { TaskAutomationContext, GeneralAutomationContext } = require('./config/automation-context');
const generalAutomationConfig = require('./config/general-automation-config');
const express = require('express');
const bodyParser = require('body-parser');
const slackData = require('./data/slack.json');

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
    const { taskId, action, team, mode } = req.query;
    // const taskId = '86cygabpu';
    // const action = 'create-sub-tasks';

    if (!taskId || !action || !team) {
        console.error("Task ID, action and team are required for task automation");
        res.status(400).send('Task ID, action and team are required for task automation');
        return;
    }

    try {
        const clickupService = new ClickUpService({ team });
        const task = await clickupService.getTaskDetailsV2(taskId);
        const context = new TaskAutomationContext(task);
        await runAutomation(context, action, { team, mode });
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
    const isApiCall = req && res;
    const action = req.query.action;
    const team = req.query.team;
    const mode = req.query.mode;

    if (!action || !team) {
        console.error("Action and team are required for general automation");
        return;
    }

    try {
        const context = new GeneralAutomationContext(generalAutomationConfig);
        await runAutomation(context, action, { team, mode });
        if (isApiCall) {
            return res.status(200).send('Automation run successfully');
        }
        return;
    } catch (error) {
        console.error('Error running general automation:', error.message);
        if (isApiCall) {
            return res.status(500).send(`Error running general automation, Action: ${action}, Team: ${team}`);
        }
        throw error;
    }
}

async function handleSlackInteraction(req, res) {
    try {
        const payload = JSON.parse(req.body.payload);
        const action = payload.actions?.[0];
        const actionId = action?.action_id;
        const valuePayload = JSON.parse(action?.value);
        const mode = valuePayload.mode;
        const team = valuePayload.team;

    switch (actionId) {
        case 're-generate-release-digest':
            console.log("Re-generating release digest");
            handleGeneralAutomation({ query: { action: 'post-weekly-release-digest', mode: mode || 'review', team } });
            break;
        case 'publish-release-digest':
            console.log("Publishing release digest");
            handleGeneralAutomation({ query: { action: 'post-weekly-release-digest', mode: moode || 'publish', team } });
            break;
    }
        res.send('Done');
    } catch (error) {
        res.status(500).send('Error handling slack interaction', error.message);
    }
}

async function runAutomation(context, action, params = {}) {

    const { team, mode = 'review' } = params;
    const configManager = new ConfigManager(context);
    configManager.enableAutomation(action);
    const config = configManager.getConfig();
    Object.values(config).forEach(automation => {
        automation.then.data.mode = mode || 'review';
        automation.then.data.team = team;
    });
    const automationManager = new AutomationManager(config);
    return automationManager.runAutomations(context);
}

// handleTaskAutomation()
// handleGeneralAutomation('post-weekly-release-digest')