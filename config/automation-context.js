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
        super(config);
    }
}

module.exports = {
    AutomationContext,
    TaskAutomationContext,
    GeneralAutomationContext
}; 