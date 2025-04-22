const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const SlackService = require("../services/slackService");
class PostWeeklyReleaseDigestAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
  }

  async run(context) {
    try {
      // Get the update_custom_fields action from the then clause
      const isCorrectAutomation = this.config.automationFile === "post-weekly-release-digest";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run post-weekly-release-digest");
      }

      // if sprintPhase is start, then post the digest for the last 7 days from the previous sprint list
      // if sprintPhase is mid, then post the digest for the last 7 days from the current sprint list
      // if sprintPhase is not a sprint check day, then do nothing

      const { phase, startDate, endDate } = this.clickupService.getSprintPhase();
      console.log({ phase, startDate, endDate })
      if (phase === 2) {
        console.warn('Not a sprint check day')
        // return
      }

      const { current, previous } = await this.clickupService.fetchCurrentAndPreviousSprint();
      const sprintList = phase === 0 ? previous : current;

      const tasks = await this.clickupService.fetchTasksByListId(sprintList.id);

      const summary = this.clickupService.summarizeTasksForReleaseDigest({ tasks, startDate, endDate });
    //   console.log({ summary: JSON.stringify(summary, null, 2) })
      const slackService = new SlackService();
      const messages = slackService.formatReleaseDigestMessages({ summary, startDate, endDate });
      // console.log({ messages: JSON.stringify(messages[4], null, 2) })
      const response = await slackService.postMessage(messages[0]);
      console.log({response})
      if (response.ok && response.ts) {
          for (let i = 1; i < messages.length; i++) {
              await slackService.postMessage(messages[i], response.ts);
          }
      }

      console.log("Release digest posted successfully");
    } catch (error) {
      console.error("Error posting release digest:", error);
      throw error;
    }
  }
}

module.exports = PostWeeklyReleaseDigestAutomation;
