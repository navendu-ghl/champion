module.exports = class OpenAIService {
    apiKey = JSON.parse(process.env.OPENAI_API_KEY || "{}").OPENAI_API_KEY

    constructor() {
        const OpenAI = require('openai');
        this.openai = new OpenAI({ apiKey: this.apiKey });
    }

    async generateReleaseNote(taskDetailsString, prDetails) {
        const prDetailsString = Array.isArray(prDetails) && prDetails.length > 0 ? prDetails.reduce((result, prDetail, idx) => {
            const { title, body = '', commits, diff = '' } = prDetail
            return result.concat(`
                PR-${idx} Title: ${title}
                PR-${idx} Commit Messages: ${commits}
            `)
        }, 'PR Details:\n') : '';

        const prompt = `
            Generate a well-structured and concise release note in plain text (no markdown), strictly under 200 words, based on the following details:  

  
            ${taskDetailsString}  
            ${prDetailsString}

            Format the release note using clear sections and bullet points where applicable.  

            Include only the following sections:  
            - What's New: Describe the new features or changes introduced.  
            - Why It Matters: Explain the benefits or improvements these changes bring.  
            - Important Details: Highlight any critical information (if applicable).  

            Ensure the release note is user-friendly, easy to scan, and written in a professional yet approachable tone, focusing on end users.
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-2024-11-20",
                messages: [
                    { role: "system", content: "You are a product manager skilled in drafting release notes." },
                    { role: "user", content: prompt }
                ]
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error("Error in generateReleaseNote");
            throw error;
        }
    }
}