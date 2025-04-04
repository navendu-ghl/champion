const axios = require('axios');

module.exports = class GitHubService {
    apiKey = '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'
    // apiKey = JSON.parse(process.env.GITHUB_API_KEY || "{}").GITHUB_API_KEY

    constructor() {
        this.githubBaseUrl = 'https://api.github.com';
        this.headers = { Authorization: `token ${this.apiKey}` };
    }

    async makeGitHubRequest(url) {
        try {
            const response = await axios.get(url, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error("Error calling GitHub API:", JSON.stringify(error));
            throw error;
        }
    }

    async getCommitMessages(repoOwner, repoName, prNumber) {
        try {
            const url = `${this.githubBaseUrl}/repos/${repoOwner}/${repoName}/pulls/${prNumber}/commits`;
            const data = await this.makeGitHubRequest(url);
            return data?.map(commit => commit.commit.message).join('\n') || '';
        } catch (error) {
            console.error(`Error in getCommitMessages`)
            throw error
        }
        
    }

    async getPRDiff(repoOwner, repoName, prNumber) {
        try {
            const url = `${this.githubBaseUrl}/repos/${repoOwner}/${repoName}/pulls/${prNumber}.diff`;
            const response = await axios.get(url, { headers: { ...this.headers, Accept: "application/vnd.github.v3.diff" }});
            return response.data || '';
        } catch (error) {
            console.error("Error in getPRDiff");
            throw error
        }
    }

    async getPRDetails(prLink) {
        try {
            const match = prLink.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
            if (!match) throw new Error("Invalid PR link format");
            const [_, repoOwner, repoName, prNumber] = match;

            const url = `${this.githubBaseUrl}/repos/${repoOwner}/${repoName}/pulls/${prNumber}`;
            const prData = await this.makeGitHubRequest(url);

            const [commits, diff] = await Promise.all([
                this.getCommitMessages(repoOwner, repoName, prNumber),
                this.getPRDiff(repoOwner, repoName, prNumber)
            ])

            return {
                title: prData.title || '',
                body: prData.body || '',
                commits,
                diff,
            };
        } catch (error) {
            console.error("Error in getPRDetails");
            throw error
        }
        
    }
}