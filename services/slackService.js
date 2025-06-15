const axios = require('axios');
const slackData = require('../data/slack.json');

class SlackService {
  
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
    'UI/UX': {
      order: 6,
      emoji: '🎨',
      title: 'UI/UX',
    },
    'Support Tickets': {
      order: 7,
      emoji: '🎟️',
      title: 'Support Tickets',
    },
    Other: {
      order: 8,
      emoji: '📦',
      title: 'Other',
    },
  };

  constructor({ team }) {
    this.botToken = JSON.parse(process.env.SLACK_API_KEY || "{}").SLACK_API_KEY;
    this.baseUrl = 'https://slack.com/api';
    this.team = team;
    this.slackData = slackData[team];
    this.MAX_BLOCKS = 50;
  }

  formatReleaseDigestMessages({ summary, startDate, endDate }) {
    const messages = [];
    const MAX_BLOCKS = 50;
    
    // Create header message
    const headerMessage = {
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
              text: `*Date Range:* ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`,
            },
          ],
        },
        {
          "type": "context",
          "elements": [
              {
                  "type": "mrkdwn",
                  "text": `<!subteam^${this.slackData.userGroup}>`
              }
          ]
        }
      ],
    };
    messages.push(headerMessage);

    // Process categories
    const sortedSummary = Object.entries(summary).sort((a, b) => this.taskCategoryMap[a[0]].order - this.taskCategoryMap[b[0]].order);
    
    let currentMessage = {
      blocks: [],
      text: 'Release Digest Details'
    };

    for (const [category, data] of sortedSummary) {
      const tasks = data.tasks;
      const categoryBlocks = [
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
      ];

      // Check if adding category header would exceed limit
      if (currentMessage.blocks.length + categoryBlocks.length > MAX_BLOCKS) {
        messages.push(currentMessage);
        currentMessage = {
          blocks: [],
          text: 'Release Digest Details (Continued)'
        };
      }
      
      currentMessage.blocks.push(...categoryBlocks);

      // Process tasks
      for (const task of tasks) {
        const taskBlocks = [];
        const _taskName = category === 'Other' ? `• ${task.name} - <${task.url}|Details>` : `• ${task.name}`;
        
        taskBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: _taskName,
          },
        });

        if (category !== 'Other') {
          taskBlocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Owner: ${task.assignees.map((assignee) => `<@${this.slackData.members[assignee]?.slackId}>`).join(', ')} | <${task.url}|Details>`,
              },
            ],
          });
        }

        // Check if adding task blocks would exceed limit
        if (currentMessage.blocks.length + taskBlocks.length > MAX_BLOCKS) {
          messages.push(currentMessage);
          currentMessage = {
            blocks: [],
            text: 'Release Digest Details (Continued)'
          };
        }

        currentMessage.blocks.push(...taskBlocks);
      }
    }

    // Add the last message if it has any blocks
    if (currentMessage.blocks.length > 0) {
      messages.push(currentMessage);
    }

    // Add footer as separate message
    const footerMessage = {
      text: '🏁 Keep up the amazing work, team! 🚀',
      blocks: [
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
      ],
    };
    messages.push(footerMessage);

    return messages;
  }

  formatMessageForReleaseDigestReviewer() {
    const message = { text: 'Review the release digest',  blocks: [
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": "Please review the release digest",
          "emoji": true
        }
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Re-generate",
              "emoji": true
            },
            "value": `${JSON.stringify({
              "action": "re-generate-release-digest",
              "mode": "review",
              "team": this.team
            })}`,
            "action_id": "re-generate-release-digest"
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Publish",
              "emoji": true
            },
            "style": "danger",
            "value": `${JSON.stringify({
              "action": "publish-release-digest",
              "mode": "publish",
              "team": this.team
            })}`,
            "action_id": "publish-release-digest"
          }
        ]
      }
    ],
    };

    return message;
  }


  async openDmChannel(userId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/conversations.open`,
        { users: userId },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data?.channel?.id;
    } catch (error) {
      console.error('Error opening DM channel:', error.message);
      return false;
    }
  }

  async postMessage({ message, channelId, threadId = null }) {
    try {
      if (!channelId) {
        console.error('Channel ID is required');
        return null;
      }
      const _message = typeof message === 'string' ? { text: message } : message;
      const response = await axios.post(
        `${this.baseUrl}/chat.postMessage`,
        {
          channel: channelId,
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
        console.log("posting message--->", JSON.stringify(_message));
        console.error('Slack API Error:', response.data.error);
        return null;
      } else {
        console.log('Message posted successfully!');
        return response.data;
      }
    } catch (error) {
      console.error('Error posting message:', error.message);
      return false;
    }
  }

  async updateMessage({ message, channelId, messageTs = null }) {
    if (!channelId || !messageTs) {
      console.error('Channel ID and message TS are required');
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat.update`,
        {
          channel: channelId,
          ...message,
          parse: 'mrkdwn', // Enable markdown parsing
          ts: messageTs,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error updating message:', error.message);
      return false;
    }
  }

  getStandupSummaryParentMessage() {
    const keepSilent = this.team === 'mobile';
    const date = new Date().toLocaleDateString("en-GB");

    const parentMessage = {
      text: `🚀 Daily Task Summary: ${date}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: `🚀 Daily Task Summary: ${date}`,
            emoji: true,
          },
        },
         ...(!keepSilent ? [{
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `team: ${this.team}  |  cc: <!subteam^${this.slackData.userGroup}>`,
            },
          ],
        }]: []),
      ],
    };
    return parentMessage;
  }

  formatStandupSummaryForSlack({ summary, sprintBoardUrl }) {
    try {
      const { summaryByAssignee, summaryByStatus } = summary;
      if (!Object.keys(summaryByAssignee).length) throw new Error("No tasks found.");

      const messages = [];
      const date = new Date().toLocaleDateString();

      Object.entries(summaryByAssignee).forEach(([assigneeEmail, data]) => {
        const assignee = this.slackData.members[assigneeEmail]?.name;
        if (!assignee) return;

        const message = {
          text: `Task Summary for ${assignee}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `👤  ${assignee}`,
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<@${this.slackData.members[assigneeEmail]?.slackId}>`,
              },
              accessory: {
                type: "overflow",
                action_id: "more_options",
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Refresh"
                    },
                    value: `${JSON.stringify({
                      "subAction": "refresh-standup-summary",
                      "team": this.team,
                      "assignee": assigneeEmail
                    })}`
                  },
                  {
                    text: {
                      type: "plain_text",
                      text: "Open Board"
                    },
                    value: `${JSON.stringify({
                      "subAction": "open-standup-board",
                      "team": this.team
                    })}`,
                    url: `${sprintBoardUrl}`
                  }
                ]
              }
            },
          ],
        };
        data.tasks.sort((a, b) =>  a.status.localeCompare(b.status));
        data.tasks.forEach((task) => {
          const dueDate = task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString("en-GB") : "No due date";
          const points = task.points || 0;
          const status = task.status;

          const taskBlocks = [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `• ${task.name}`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Status: \`${status}\`  |  Due: \`${dueDate}\`  |  Story Points: \`${points}\`  |  <${task.url}|View>`,
                },
              ],
            },
          ];

          // if block length is greater than MAX_BLOCKS, do not add the task block
          // +1 for the divider
          if (message.blocks.length + taskBlocks.length + 1 > this.MAX_BLOCKS) {
            return;
          }

          message.blocks.push(...taskBlocks);
        });

        message.blocks.push({
          type: "divider",
        });
        messages.push(message);
      });

      const shouldShowStatusTable = this.slackData.features?.showStatusTableInStandup;
      if (shouldShowStatusTable) {
        // Add summary table by status
        const mrkdwnText = this.formatTaskStatusTable(summaryByStatus);
        const statusTableMessage = {
          text: "Task Summary by Status",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*📌 Task Status Summary*",
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: mrkdwnText
              },
              accessory: {
                type: "overflow",
                action_id: "more_options",
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Open Board"
                    },
                    value: `${JSON.stringify({
                      "subAction": "open-standup-board",
                      "team": this.team
                    })}`,
                    url: `${sprintBoardUrl}`
                  }
                ]
              }
            },
          ],
        };
        messages.push(statusTableMessage);
      }
      return messages;
    } catch (error) {
      console.error("Error in formatStandupSummaryForSlack");
      throw error;
    }
  }

  formatTaskStatusTable(statusMap) {
    const rows = [];
    const header = "Status                   | Count";
    const separator = "-------------------------|------";
  
    // sort statuses by status
    const sortedStatuses = Object.keys(statusMap).sort((a, b) => a.localeCompare(b));
    for (const status of sortedStatuses) {
      const items = statusMap[status];
      const label = status.padEnd(25); // pad status label to align
      rows.push(`${label}| ${items.length}`);
    }
  
    return "```\n" + [header, separator, ...rows].join("\n") + "\n```";
  }
  
}

module.exports = SlackService;
