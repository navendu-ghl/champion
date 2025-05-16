const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const SlackService = require("../services/slackService");

class PostStandupSummaryAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "post-standup-summary";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run post-standup-summary");
      }

      // Get task summary from ClickUp
      const currentSprintId = await this.clickupService.fetchCurrentSprint();
      console.log({ currentSprintId });
      const summary = await this.clickupService.summarizeTasksByAssignee(currentSprintId);

      const slackService = new SlackService();
      const parentMessage = slackService.getStandupSummaryParentMessage();
      const messages = slackService.formatStandupSummaryForSlack(summary);

      const response = await slackService.postMessage(parentMessage);
      console.log({ response });
      if (response.ok && response.ts) {
        for (const message of messages) {
          await slackService.postMessage(message, response.ts);
        }
      }

      console.log("Standup summary posted successfully!");
    } catch (error) {
      console.error("Error posting standup summary:", error);
      throw error;
    }
  }
}

module.exports = PostStandupSummaryAutomation;
