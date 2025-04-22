const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const GitHubService = require("../services/githubService");
const OpenAIService = require("../services/openAIService");

class GenerateReleaseNoteAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.clickupService = new ClickUpService();
    this.githubService = new GitHubService();
    this.openAIService = new OpenAIService();
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "generate-release-note";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run generate-release-note");
      }

      const task = context.getTask();

      const [taskDetailsString, cuComments] = await Promise.all([
        this.clickupService.getTaskDetailsString(task.id),
        this.clickupService.getTaskComments(task.id),
      ]);

      const prLinks = this.clickupService.extractPRLinksFromComments(cuComments);
      const prDetails = await Promise.all(prLinks.map((link) => this.githubService.getPRDetails(link)));

      const releaseNote = await this.openAIService.generateReleaseNote(taskDetailsString, prDetails);
      await this.clickupService.postTaskComment(task.id, releaseNote);

      console.log("Release note generated successfully");
    } catch (error) {
      console.error("Error generating release note:", error);
      throw error;
    }
  }
}

module.exports = GenerateReleaseNoteAutomation;
