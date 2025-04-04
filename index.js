const functions = require('@google-cloud/functions-framework');
const ClickUpService = require('./services/clickupService');
const AutomationManager = require('./automation-manager');
const automationConfig = require('./config');

// (async (req, res) => {
//     // const taskId = req.query.taskId // 86cwgu8a6
//     // const taskId = '86cyfy91q' // parent task
//     const taskId = '86cyg0345'
//     if (!taskId) {
//         // res.status(400).send("Clickup taskId is required.");
//     }

//     const clickupService = new ClickUpService();
//     const automationManager = new AutomationManager(automationConfig);

//     try {
//         const task = await clickupService.getTaskDetailsV2(taskId);
//         // console.log({ task: JSON.stringify(task, null, 2) });
//         const { results, errors } = await automationManager.runAutomations(task);
//         console.log('Automation results:', results);
//         if (errors.length > 0) {
//             console.error('Automation errors:', errors);
//         }
//     } catch (error) {
//         console.error('Error running automations:', error);
//     }

//     // res.send(`Hello ${req.query.name || req.body.name || 'World'}!`);
// })();

const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;

app.get('/run', handleRun);

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});


async function handleRun(req, res) {
    const taskId = req.query.taskId;
    const action = req.query.action;
    if (!taskId || !action) {
        res.status(400).send("Clickup taskId and action are required.");
    }

    const _automationConfig = { ...automationConfig }
    _automationConfig.forEach(automation => {
        if (automation.id === action) {
            automation.enabled = true;
        }
    });

    const clickupService = new ClickUpService();
    const automationManager = new AutomationManager(_automationConfig);

    try {
        const task = await clickupService.getTaskDetailsV2(taskId);
        // console.log({ task: JSON.stringify(task, null, 2) });
        const { results, errors } = await automationManager.runAutomations(task);
        console.log('Automation results:', results);
        if (errors.length > 0) {
            console.error('Automation errors:', errors);
        }
    } catch (error) {
        console.error('Error running automations:', error);
    }

    // res.send(`Hello ${req.query.name || req.body.name || 'World'}!`);

}
