const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const SlackService = require("../services/slackService");

const slackData = require("../data/slack.json");
class PostWeeklyReleaseDigestAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.mode = config.then.data.mode || 'review';
    this.team = config.then.data.team;
    this.clickupService = new ClickUpService({ team: this.team });
    this.slackService = new SlackService({ team: this.team });
  
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

      const { phase, startDate, endDate } = this.clickupService.getHalfSprintDateRange();
      console.log({ phase, startDate, endDate })
      if (phase === 2) {
        console.warn('Not a sprint check day')
        // return
      }

      const { current, previous } = await this.clickupService.fetchCurrentAndPreviousSprint();
      const sprintList = phase === 0 ? previous : current;

      const tasks = await this.clickupService.fetchTasksByListId({ listId: sprintList.id });

      const summary = this.clickupService.summarizeTasksForReleaseDigest({ tasks, startDate, endDate });
      const messages = this.slackService.formatReleaseDigestMessages({ summary, startDate, endDate });

      if (this.mode === 'publish') {
        console.log('Publishing release digest')
        await this.publishReleaseDigest(messages);
      } else if (this.mode === 'review') {
        console.log('Sending release digest for review')
        await this.sendReleaseDigestForReview(messages);
      }

      console.log("Release digest posted successfully");
    } catch (error) {
      console.error("Error posting release digest:", error);
      throw error;
    }
  }

  async sendReleaseDigestForReview(messages) {
    try {
      const userId = slackData[this.team].reviewer;
      if (!userId) {
        throw new Error("sendReleaseDigestForReview: User ID not found");
      }
      const channelId = await this.slackService.openDmChannel(userId);
      const response = await this.slackService.postMessage({ message: messages[0], channelId });
      if (response.ok && response.ts) {
          for (let i = 1; i < messages.length; i++) {
              await this.slackService.postMessage({ message: messages[i], channelId, threadId: response.ts });
          }
      }

      const actionMessage = this.slackService.formatMessageForReleaseDigestReviewer();
      await this.slackService.postMessage({ message: actionMessage, channelId });
    } catch (error) {
      console.error("Error sending release digest for review:", error);
      throw error;
    }
  }

  async publishReleaseDigest(messages) {
    try {
      const channelId = slackData[this.team].internalChannel;
      if (!channelId) {
        throw new Error("publishReleaseDigest: Channel ID not found");
      }
      
      const response = await this.slackService.postMessage({ message: messages[0], channelId });
      if (response.ok && response.ts) {
          for (let i = 1; i < messages.length; i++) {
              await this.slackService.postMessage({ message: messages[i], channelId, threadId: response.ts });
          }
        }
    } catch (error) {
      console.error("Error publishing release digest:", error);
      throw error;
    }
  }
}

module.exports = PostWeeklyReleaseDigestAutomation;
