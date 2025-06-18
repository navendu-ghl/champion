class AutomationContext {
    constructor(config) {
        this.config = config;
    }
    
    getConfig() {
        return this.config;
    }
}

class TaskAutomationContext extends AutomationContext {
    constructor(task) {
        super({ task });
        this.task = task;
    }
    
    getTask() {
        return this.task;
    }
}

class GeneralAutomationContext extends AutomationContext {
    constructor(config) {
        // Create a deep copy of the config to avoid sharing state between requests
        const configInstance = JSON.parse(JSON.stringify(config));
        super(configInstance);
    }
}

module.exports = {
    AutomationContext,
    TaskAutomationContext,
    GeneralAutomationContext
}; 