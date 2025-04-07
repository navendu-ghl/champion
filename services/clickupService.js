const axios = require('axios');
const teams = require('../data/teams.json');

class ClickUpService {
  apiKey = 'pk_61405013_J7LUL9D1W7RR3WH7HURV3JMWFIWMO2T0';
  // apiKey = JSON.parse(process.env.CLICKUP_API_KEY || "{}").CLICKUP_API_KEY

  constructor() {
    this.CLICKUP_SPRINT_FOLDER_ID = teams['automation-calendars'].sprintFolderId;
    this.clickupBaseUrl = 'https://api.clickup.com/api/v2';
    this.headers = { Authorization: this.apiKey };
  }

  async makeClickUpRequest(url, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url,
        headers: this.headers,
        ...(data && { data }), // Only add data if it's provided
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Error calling ClickUp API:', JSON.stringify(error));
      throw error;
    }
  }

  isCustomTaskId(taskId) {
    return /^GHL[A-Z]*-\d+$/.test(taskId);
  }

  async getTaskDetails(taskId, includeSubtasks = false) {
    try {
      // const _isCustomTaskId = isCustomTaskId(taskId)
      const url = `${this.clickupBaseUrl}/task/${taskId}?include_subtasks=${includeSubtasks}${this.isCustomTaskId(taskId) ? '&custom_task_ids=true&team_id=8631005' : ''}`;
      const data = await this.makeClickUpRequest(url);
      return { title: data?.name || '', description: data?.description || '', subtasks: data?.subtasks || [] };
    } catch (error) {
      console.error(`Error in getTaskDetails`);
      throw error;
    }
  }

  async getTaskComments(taskId, onlyText = false) {
    try {
      const url = `${this.clickupBaseUrl}/task/${taskId}/comment${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
      const data = await this.makeClickUpRequest(url);
      return onlyText ? data?.comments?.map((comment) => comment.comment_text) || [] : data?.comments || [];
    } catch (error) {
      console.error(`Error in getTaskComments`);
      throw error;
    }
  }

  async postTaskComment(taskId, commentText) {
    try {
      const url = `${this.clickupBaseUrl}/task/${taskId}/comment${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
      const data = await this.makeClickUpRequest(url, 'POST', { comment_text: commentText });
      return data;
    } catch (error) {
      console.error(`Error in postTaskComment`);
      throw error;
    }
  }

  async copyTaskComments(taskId, duplicateTaskId) {
    try {
      const comments = await this.getTaskComments(taskId);
      // sort the comments by created date
      const sortedComments = comments.sort((a, b) => new Date(a.date) - new Date(b.date));

      // make it synchronous to make sure the comments are in the correct order
      for (const comment of sortedComments) {
        const _comment = `${comment.user.username} - ${comment.comment_text}`;
        await this.postTaskComment(duplicateTaskId, _comment);
      }
    } catch (error) {
      console.error(`Error in copyTaskComments`);
      throw error;
    }
  }

  extractPRLinksFromComments(taskComments) {
    try {
      const prLinks = taskComments.flatMap(
        (comment) =>
          comment.comment?.filter((item) => item.attributes?.link?.includes('github.com')).map((item) => item.attributes.link) || [],
      );

      return prLinks;
    } catch (error) {
      console.error(`Error in extractPRLinksFromComments`);
      throw error;
    }
  }

  async postTaskComment(taskId, commentText) {
    const url = `${this.clickupBaseUrl}/task/${taskId}/comment${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
    try {
      const response = await this.makeClickUpRequest(url, 'POST', { comment_text: commentText });
      return response;
    } catch (error) {
      console.error(`Error in postTaskComment`);
      throw error;
    }
  }

  extractSubtaskIds(taskResponse) {
    // console.log({ taskResponse })
    const subtaskIds = [];

    // Helper function to recursively process subtasks
    function processSubtasks(subtasks) {
      if (!subtasks || !Array.isArray(subtasks)) return;

      subtasks.forEach((subtask) => {
        if (subtask.id) {
          subtaskIds.push(subtask.id);
        }
        // Recursively process nested subtasks
        if (subtask.subtasks) {
          processSubtasks(subtask.subtasks);
        }
      });
    }

    // Start processing from the main task's subtasks
    if (taskResponse.subtasks) {
      processSubtasks(taskResponse.subtasks);
    }

    return subtaskIds;
  }

  async getTaskDetailsString(taskId) {
    const [taskDetails, taskComments] = await Promise.all([this.getTaskDetails(taskId, true), this.getTaskComments(taskId)]);
    const subtaskIds = this.extractSubtaskIds(taskDetails);
    const subtaskDetailsPromise = Promise.all(subtaskIds.map((subtaskId) => this.getTaskDetails(subtaskId, false)));
    const subtaskCommentsPromise = Promise.all(subtaskIds.map((subtaskId) => this.getTaskComments(subtaskId)));
    const [subtaskDetails, subtaskComments] = await Promise.all([subtaskDetailsPromise, subtaskCommentsPromise]);

    const taskCommentString = taskComments.reduce((result, comment) => result.concat(`${comment?.comment_text}\n`), '');
    let subtaskDetailsString = 'Subtasks:\n';
    for (let idx = 0; idx < subtaskIds.length; idx++) {
      const subtaskDetail = subtaskDetails[idx];
      const subtaskComment = subtaskComments[idx];
      const subtaskCommentString = subtaskComment.reduce((result, comment) => result.concat(`${comment?.comment_text}\n`), '');

      subtaskDetailsString += `
                Subtask Title: ${subtaskDetail.title}
                Subtask Description: ${subtaskDetail.description.substring(0, 1000)}
                Subtask Comments: ${subtaskCommentString.substring(0, 1000)}
            `;
    }

    const taskDetailsString = `
            Task:
            - Title: ${taskDetails.title}
            - Description: ${taskDetails.description.substring(0, 1000)}
            - Comments: ${taskCommentString.substring(0, 1000)}
            ${subtaskDetailsString}
            `;

    return taskDetailsString;
  }

  // for clickup automation

  async getTaskDetailsV2(taskId, includeSubtasks = false) {
    try {
      // const _isCustomTaskId = isCustomTaskId(taskId)
      const url = `${this.clickupBaseUrl}/task/${taskId}?include_subtasks=${includeSubtasks}${this.isCustomTaskId(taskId) ? '&custom_task_ids=true&team_id=8631005' : ''}`;
      const data = await this.makeClickUpRequest(url);
      return data;
    } catch (error) {
      console.error(`Error in getTaskDetails`);
      throw error;
    }
  }

  async setCustomFields(taskId, customFieldKey, customFieldValue) {
    try {
      // https://api.clickup.com/api/v2/task/{task_id}/field/{field_id}
      const url = `${this.clickupBaseUrl}/task/${taskId}/field/${customFieldKey}${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
      const data = {
        value: customFieldValue,
      };
      const response = await this.makeClickUpRequest(url, 'POST', data);
      return response;
    } catch (error) {
      console.error(`Error in setCustomFields`);
      throw error;
    }
  }

  async updateTask(taskId, data) {
    try {
      const url = `${this.clickupBaseUrl}/task/${taskId}${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
      const response = await this.makeClickUpRequest(url, 'PUT', data);
      return response;
    } catch (error) {
      console.error(`Error in updateTask`);
      throw error;
    }
  }

  async getCustomItems() {
    try {
      const url = `${this.clickupBaseUrl}/team/8631005/custom_item`;
      const data = await this.makeClickUpRequest(url);
      return data;
    } catch (error) {
      console.error(`Error in getCustomItems`);
      throw error;
    }
  }

  async createTask(listId, data) {
    try {
      const url = `${this.clickupBaseUrl}/list/${listId}/task`;
      const response = await this.makeClickUpRequest(url, 'POST', data);
      return response;
    } catch (error) {
      console.error(`Error in createTask`);
      throw error;
    }
  }

  async duplicateTask(task, data) {
    const { customFields, ...rest } = data;
    const duplicateTaskData = {
      ...rest,
      custom_fields: customFields.map((field) => ({
        id: field.key,
        value: field.value,
      })),
    };

    const duplicateTask = await this.createTask(task.list.id, duplicateTaskData);
    return duplicateTask;
  }

  async fetchSprintLists() {
    try {
      const url = `${this.clickupBaseUrl}/folder/${this.CLICKUP_SPRINT_FOLDER_ID}/list`;
      const response = await this.makeClickUpRequest(url);
      return response.lists;
    } catch (error) {
      console.error(`Error in fetchSprintLists`);
      throw error;
    }
  }

  async addTaskToList(taskId, listId) {
    try {
      const url = `${this.clickupBaseUrl}/list/${listId}/task/${taskId}${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
      const response = await this.makeClickUpRequest(url, 'POST');
      return response;
    } catch (error) {
      console.error(`Error in addTaskToList`);
      throw error;
    }
  }

  async addTagToTask(taskId, tagId) {
    try {
      const url = `${this.clickupBaseUrl}/task/${taskId}/tag/${tagId}${this.isCustomTaskId(taskId) ? '?custom_task_ids=true&team_id=8631005' : ''}`;
      const response = await this.makeClickUpRequest(url, 'POST');
      return response;
    } catch (error) {
      console.error(`Error in addTagToTask`);
      throw error;
    }
  }
}

module.exports = ClickUpService;
