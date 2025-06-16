const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const SlackService = require("../services/slackService");
const slackData = require("../data/slack.json");
const usersData = require("../data/users.json");
const clickupData = require("../data/clickup.json");

class PostStandupSummaryAutomation extends AutomationBase {

  constructor(config) {
    super(config);
    this.name = config.name;
    this.team = config.then.data.team;
    this.mode = config.then.data.mode;
    this.subAction = config.then.data.subAction;
    this.channelId = config.then.data.channelId;
    this.messageTs = config.then.data.messageTs;
    const assigneeEmail = config.then.data.assignee
    this.assignees = assigneeEmail ? [usersData.find((user) => user.email === assigneeEmail).id] : undefined;
    this.clickupService = new ClickUpService({ team: this.team });
    this.slackService = new SlackService({ team: this.team });
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "post-standup-summary";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run post-standup-summary");
      }

      // Get task summary from ClickUp
      const currentSprintId = await this.clickupService.fetchCurrentSprint();
      if(!currentSprintId) {
        throw new Error("No current sprint found");
      }
      const sprintBoardUrl = this.clickupService.getSprintBoardUrl(currentSprintId);
      const summary = await this.clickupService.summarizeTasksForStandup({ listId: currentSprintId, assignees: this.subAction === 'refresh-standup-summary' ? this.assignees : undefined });

      const parentMessage = this.slackService.getStandupSummaryParentMessage();
      const messages = this.slackService.formatStandupSummaryForSlack({ summary, sprintBoardUrl });

      
      if (this.mode === 'publish') {
        console.log('Publishing standup summary')
        await this.publishStandupSummary({ parentMessage, messages });
      } else if (this.mode === 'review') {
        console.log('Sending standup summary for review')
        await this.sendStandupSummaryForReview({ parentMessage, messages });
      } else if (this.mode === 'refresh') {
        console.log('Refreshing standup summary')
        await this.refreshStandupSummary({ message: messages[0] });
      }

      console.log("Standup summary posted successfully!");
    } catch (error) {
      console.error("Error posting standup summary:", error);
      throw error;
    }
  }

  async sendStandupSummaryForReview({ parentMessage, messages }) {
    try {
      const userId = slackData[this.team].reviewer;
      if (!userId) {
        throw new Error("sendStandupSummaryForReview: User ID not found");
      }
      const channelId = await this.slackService.openDmChannel(userId);
      const response = await this.slackService.postMessage({ message: parentMessage, channelId });
      if (response.ok && response.ts) {
        for (const message of messages) {
          await this.slackService.postMessage({ message, channelId, threadId: response.ts });
        }
      }
    } catch (error) {
      console.error("Error sending standup summary for review:", error);
      throw error;
    }
  }

  async publishStandupSummary({ parentMessage, messages }) {
    try {
      const channelId = slackData[this.team].internalChannel;
      if (!channelId) {
        throw new Error("publishStandupSummary: Channel ID not found");
      }
      const response = await this.slackService.postMessage({ message: parentMessage, channelId });
      if (response.ok && response.ts) {
        for (const message of messages) {
          await this.slackService.postMessage({ message, channelId, threadId: response.ts });
        }
      }
    } catch (error) {
      console.error("Error publishing standup summary:", error);
      throw error;
    }
  }

  async refreshStandupSummary({ message }) {
    try {
      const channelId = this.channelId;
      const messageTs = this.messageTs;
      if (!channelId || !messageTs) {
        throw new Error("refreshStandupSummary: Channel ID or message TS not found");
      }
     const response = await this.slackService.updateMessage({ message, channelId, messageTs });
    } catch (error) {
      console.error("Error refreshing standup summary:", error);
      throw error;
    }
  }
}

module.exports = PostStandupSummaryAutomation;
