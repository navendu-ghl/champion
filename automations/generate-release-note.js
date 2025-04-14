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

  async run(task) {
    try {
      const generateReleaseNoteAction = this.config.id === "generate_release_note";

      if (!generateReleaseNoteAction) {
        throw new Error("No generate_release_note action found in config");
      }

      const [taskDetailsString, cuComments] = await Promise.all([
        this.clickupService.getTaskDetailsString(task.id),
        this.clickupService.getTaskComments(task.id),
      ]);

      const prLinks = this.clickupService.extractPRLinksFromComments(cuComments);
      const prDetails = await Promise.all(prLinks.map((link) => this.githubService.getPRDetails(link)));

      const releaseNote = await this.openAIService.generateReleaseNote(taskDetailsString, prDetails);
      const response = await this.clickupService.postTaskComment(task.id, releaseNote);

      console.log("Release note generated successfully");
    } catch (error) {
      console.error("Error generating release note:", error);
      throw error;
    }
  }
}

module.exports = GenerateReleaseNoteAutomation;
