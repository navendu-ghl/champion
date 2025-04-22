const axios = require('axios');
const teams = require('../data/teams.json');
const ClickUpHelper = require('../clickup-helper');

class ClickUpService {
  apiKey = 'pk_61405013_J7LUL9D1W7RR3WH7HURV3JMWFIWMO2T0';
  // apiKey = JSON.parse(process.env.CLICKUP_API_KEY || "{}").CLICKUP_API_KEY

  constructor() {
    this.CLICKUP_SPRINT_FOLDER_ID = teams['automation-calendars'].sprintFolderId;
    this.clickupBaseUrl = 'https://api.clickup.com/api/v2';
    this.headers = { Authorization: this.apiKey };
    this.clickupHelper = new ClickUpHelper();
  }

  closedStatuses = ['task - complete', 'deployed', 'Closed'];

  customFields = [
    {
      field_id: '3eebd94c-e275-4588-9844-7e0791ac98b3',
      operator: '=',
      value: '3e010797-3387-4ecc-b374-dfcaec70960b',
    },
    {
      field_id: 'e22b9906-6bb7-48f6-9d15-374cb18106ee',
      operator: '=',
      value: '10dfc516-26dd-4b6f-b174-e8571801241c',
    },
  ];

  statuses = [
    'Open',
    // "product backlog",
    // "product in progress",
    'product review',
    'ready for design',
    'ready for eng (direct)',
    // "design backlog",
    // "design in progress",
    // "design review",
    // "design complete",
    'sprint backlog',
    'sprint assigned',
    'dev in progress',
    'dev review',
    'dev testing',
    'ready for qa',
    'qa in progress',
    'qa fail',
    'bug fixing',
    'qa complete',
    'task - in progress',
    'task - blocked',
    // "ready fo ux audit",
    // "ux audit in progress",
    // "ux audit complete",
    'ready for deploy',
    ...this.closedStatuses,
  ];

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

  async fetchTasksByListId(listId) {
    const url = `${this.clickupBaseUrl}/list/${listId}/task?include_timl=true&subtasks=true&custom_fields=${JSON.stringify(this.customFields)}&${this.statuses.map((status) => `statuses=${status}`).join('&')}`;

    try {
      const response = await this.makeClickUpRequest(url);
      return response.tasks;
    } catch (error) {
      console.error('Failed to fetch ClickUp tasks:', error.response ? error.response.data : error.message);
      return null;
    }
  }

  async fetchReleasedItems({ listId, startDate, endDate }) {
    try {
      const tasks = await this.fetchTasksByListId(listId);
      // check if the status is closedStatuses and if the date_closed or date_done is between startDate and endDate
      const releasedItems = tasks.filter((task) => {
        const status = task.status?.status;
        const closedDate = task.date_closed || task.date_done;
        return this.closedStatuses.includes(status) && (closedDate >= startDate && closedDate <= endDate);
      });
      return releasedItems;
    } catch (error) {
      console.error(`Error in fetchReleasedItems`);
      throw error;
    }
  }

  getSprintPhase(referenceStartDate = '2025-01-29') {
    const today = new Date();
    const refStart = new Date(referenceStartDate);

    // Normalize to start of the day to avoid timezone issues
    today.setHours(0, 0, 0, 0);
    refStart.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor((today - refStart) / (1000 * 60 * 60 * 24));

    // return the start and end date of the phase
    const startDate = new Date(refStart.getTime() + daysSinceStart * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Sprint is 14 days, check if today is a multiple of 14 since start
    let phase = 2; // not a sprint check day
    if (daysSinceStart % 14 === 0) {
      phase = 0; // start
    } else if (daysSinceStart % 14 === 7) {
      phase = 1;
    } else {
      phase = 2; // not a sprint check day
    }
    return { phase, startDate, endDate };
  }

  getPreviousAndCurrentSprint(sprints) {
    const now = Date.now();

    // Convert start and due dates to numbers and sort the sprints by start_date
    const sortedSprints = sprints
      .map((sprint) => ({
        ...sprint,
        start: Number(sprint.start_date),
        end: Number(sprint.due_date),
      }))
      .sort((a, b) => a.start - b.start);

    let current = null;
    let previous = null;
    for (let i = 0; i < sortedSprints.length; i++) {
      const sprint = sortedSprints[i];
      if (now >= sprint.start && now <= sprint.end) {
        current = sprint;
        previous = sortedSprints[i - 1] || null;
        break;
      }
    }

    return { current, previous };
  }

  async fetchCurrentAndPreviousSprint() {
    const lists = await this.fetchSprintLists();
    const { current, previous } = this.getPreviousAndCurrentSprint(lists);

    return { current, previous };
  }

  summarizeTasksForReleaseDigest(tasks) {
    // store name, assignee and category
    const summary = {};
    const taskMap = {};

    tasks.forEach((task) => {
      taskMap[task.id] = {...(taskMap[task.id] || {}), ...task};

      if (task.parent) {
        const parentTask = taskMap[task.parent] || {}
        parentTask.subtaskIds = parentTask.subtaskIds || []
        parentTask.subtaskIds.push(task.id)
        taskMap[task.parent] = parentTask
      }
    });

    tasks.forEach((task) => {
      if (!task.parent || (task.parent && !taskMap[task.parent]?.id)) {
        const name = task.name;

        const taskAssignee = task.assignees[0]?.username;
        const subtaskIds = taskMap[task.id]?.subtaskIds || []
        const subtaskAssignees = subtaskIds.map((subtaskId) => taskMap[subtaskId].assignees[0]?.username)
        const assignees = [...new Set([taskAssignee, ...subtaskAssignees])]
        
        const categoryValueIdx = task.custom_fields.find(
          (field) => field.id === this.clickupHelper.getCustomFieldId(task.custom_fields, '📖 Category'),
        )?.value;
        const category = this.clickupHelper.getCustomFieldOptionValue(task.custom_fields, '📖 Category', categoryValueIdx) || 'Other';

        if (!summary[category]) {
          summary[category] = {
            tasks: [],
          };
        }

        summary[category].tasks.push({ name, assignees, id: task.id, url: task.url });
      }
    });
    return summary;
  }
}

module.exports = ClickUpService;
