class AutomationManager {
    constructor(config) {
        this.config = config;
        this.automations = new Map();
        this.registerAutomations();
    }

    registerAutomations() {
        // Register all available automations
        const _config = Object.values(this.config)
        _config.forEach(config => {
            if (config.enabled) {
                const AutomationClass = require(`./automations/${config.automationFile}`);
                const automation = new AutomationClass(config);
                this.automations.set(config.automationFile, automation);
            }
        })
    }

    async runAutomations(task) {
        const results = [];
        const errors = [];

        for (const automation of this.automations.values()) {
            try {
                const isValid = await automation.validate(task);
                if (!isValid) {
                    console.warn(`Automation ${automation.name} is not valid`);
                    continue;
                } else {
                    console.log(`Automation ${automation.name} is valid`);
                    await automation.run(task);
                    results.push({ name: automation.name, status: 'success' });
                }
            } catch (error) {
                console.error(`Error running automation ${automation.name}:`, error);
                errors.push({ name: automation.name, error: error.message });
            }
        }

        return { results, errors };
    }
}

module.exports = AutomationManager; 