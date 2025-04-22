const axios = require('axios');

class SlackService {
  SLACK_CHANNEL_ID = 'C077A0PDR8X';
  SLACK_MEMBER_IDS = {
    'Anand Kumar': 'U02DDM2FC69',
    'Bhavana Gupta': 'U05EYAUD97X',
    'Lidhish C': 'U060QCCTL64',
    'Navendu Duari': 'U04LW77KCBD',
    'Sarthak Saxena': 'U08G3EJ7YL8',
    'Tarun Agarwal': 'U08C6PFKBHQ',
    Ujjaval: 'U05HS20UQD6',
    Ajaysai: 'U056G3473G9',
    'Raghav Deshpande': 'U05GATN1ZAM',
    'Devangi Naliyadhara': 'U07H59XPV43',
    'Dhananjay Waghade': 'U071W6X518Q',
    'Suvodip Mondal': 'U07HJ38KUHX',
    'Lavish Patni': 'U03U00BPMC5',
    'Ashish Ahuja': 'U05KASZT6P2',
    'Nikhil Kumar': 'U08G3EDNR4Y',
  };
  TEAM_CALENDAR_ID = 'S03T400DNN5';

  taskCategoryMap = {
    'New Feature': {
      order: 1,
      emoji: '💡',
      title: 'New Feature',
    },
    Enhancements: {
      order: 2,
      emoji: '🛠️',
      title: 'Enhancements',
    },
    'Tech Debt': {
      order: 3,
      emoji: '♻️',
      title: 'Tech Debt',
    },
    Infrastructure: {
      order: 4,
      emoji: '🏗️',
      title: 'Infrastructure',
    },
    Security: {
      order: 5,
      emoji: '🔒',
      title: 'Security',
    },
    Other: {
      order: 6,
      emoji: '📦',
      title: 'Other',
    },
  };

  constructor(botToken) {
    this.botToken = botToken;
    this.baseUrl = 'https://slack.com/api';
  }

  formatDailySummaryChildMessages(summary) {
    if (!summary) return ['No tasks found.'];

    const messages = [];
    const date = new Date().toLocaleDateString();

    Object.entries(summary).forEach(([assignee, data]) => {
      const message = {
        text: `Task Summary for ${assignee}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `👤  ${assignee}`,
              emoji: true,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `<@${this.SLACK_MEMBER_IDS[assignee]}>`,
              },
            ],
          },
        ],
      };

      data.tasks.forEach((task) => {
        const dueDate = task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString('en-GB') : 'No due date';
        const points = task.points || 0;
        const status = task.status;
        message.blocks.push(
          ...[
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `• ${task.name}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Status: \`${status}\`  |  Due: \`${dueDate}\`  |  Story Points: \`${points}\`  |  <${task.url}|View>`,
                },
              ],
            },
          ],
        );
      });

      message.blocks.push({
        type: 'divider',
      });
      messages.push(message);
    });

    return messages;
  }

  formatDailySummaryParentMessage() {
    const date = new Date().toLocaleDateString('en-GB');

    const parentMessage = {
      text: `🚀 Daily Task Summary: ${date}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: `🚀 Daily Task Summary: ${date}`,
            emoji: true,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `<!subteam^${this.TEAM_CALENDAR_ID}>`,
            },
          ],
        },
      ],
    };
    return parentMessage;
  }

  formatReleaseDigestMessage({ summary, startDate, endDate }) {
    const message = {
      text: `📅 Weekly Release Digest`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 Weekly Release Digest',
            emoji: true,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Date Range:* ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`, // dd/mm/yyyy - dd/mm/yyyy
            },
          ],
        },
      ],
    };
    const sortedSummary = Object.entries(summary).sort((a, b) => this.taskCategoryMap[a[0]].order - this.taskCategoryMap[b[0]].order);
    sortedSummary.forEach(([category, data]) => {
      const tasks = data.tasks;
      // category title
      message.blocks.push(
        {
            type: 'divider',
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${this.taskCategoryMap[category].emoji} ${this.taskCategoryMap[category].title}*`,
            },
        },
      );
      // tasks
      tasks.forEach((task) => {
        message.blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• ${task.name}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Owner: ${task.assignees.map((assignee) => `<@${this.SLACK_MEMBER_IDS[assignee]}>`).join(', ')} | <${task.url}|Details>`,
              },
            ],
          },
        );
      });
    });

    // footer
    message.blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🏁 Keep up the amazing work, team! 🚀',
          },
        ],
      },
    );
    return message;
  }

  async postMessage(message, threadId = null) {
    try {
      const _message = typeof message === 'string' ? { text: message } : message;
      const response = await axios.post(
        `${this.baseUrl}/chat.postMessage`,
        {
          channel: this.SLACK_CHANNEL_ID,
          ..._message,
          parse: 'mrkdwn', // Enable markdown parsing
          thread_ts: threadId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        console.error('Slack API Error:', response.data.error);
        return null;
      } else {
        console.log({ response });
        console.log('Message posted successfully!');
        return response.data;
      }
    } catch (error) {
      console.error('Error posting message:', error.message);
      return false;
    }
  }
}

module.exports = SlackService;
