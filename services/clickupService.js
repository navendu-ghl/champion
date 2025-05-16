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
    "product backlog",
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

  async fetchTasksByListId(listId, excludeStories = false) {
    let page = 0;
    let allTasks = [];
    let hasMoreTasks = true;
    const limit = 100;

    while (hasMoreTasks) {
      // this API has a defaukt limit of 100 tasks per page
      const url = `${this.clickupBaseUrl}/list/${listId}/task?include_timl=true&subtasks=true&custom_fields=${JSON.stringify(this.customFields)}&${this.statuses.map((status) => `statuses=${status}`).join('&')}&page=${page}`;

      try {
        const response = await this.makeClickUpRequest(url);
        const tasks = response.tasks || [];
        allTasks = allTasks.concat(tasks);
        hasMoreTasks = tasks.length === limit; // If the number of tasks is less than the limit, we've fetched all tasks
        page += 1;
      } catch (error) {
        console.error('Failed to fetch ClickUp tasks:', error.response ? error.response.data : error.message);
        hasMoreTasks = false;
      }
    }

    if (excludeStories) {
      return allTasks.filter((task) => task.custom_item_id !== 1005); // User Stories are excluded in summary
    }

    return allTasks;
  }

  getHalfSprintDateRange() {
    const currentDate = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const sprintLength = 14; // in days
    const halfSprint = 7; // in days
    const sprintStart = new Date('2025-01-29T00:00:00Z'); // Reference Wednesday
  
    // Find how many days since the sprintStart
    const daysSinceStart = Math.floor((currentDate - sprintStart) / MS_PER_DAY);
    const daysIntoCurrentSprint = daysSinceStart % sprintLength;
    const sprintNumber = Math.floor(daysSinceStart / sprintLength);
    
    let rangeStart, rangeEnd, phase;
  
    if (daysIntoCurrentSprint < halfSprint) {
      // In the first half: return last half of previous sprint
      rangeStart = new Date(sprintStart.getTime() + (sprintNumber - 1) * sprintLength * MS_PER_DAY + halfSprint * MS_PER_DAY);
      rangeEnd = new Date(rangeStart.getTime() + (halfSprint - 1) * MS_PER_DAY);
      phase = 0;
    } else {
      // In the second half: return first half of current sprint
      rangeStart = new Date(sprintStart.getTime() + sprintNumber * sprintLength * MS_PER_DAY);
      rangeEnd = new Date(rangeStart.getTime() + (halfSprint - 1) * MS_PER_DAY);
      phase = 1;
    }
  
    return {
      startDate: new Date(rangeStart.setHours(0, 0, 0, 0)),
      endDate: new Date(rangeEnd.setHours(23, 59, 59, 999)),
      phase,
    };
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

  summarizeTasksForReleaseDigest({ tasks, startDate, endDate }) {
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
      const _isTaskClosed = this.closedStatuses.includes(task.status?.status)
      const _closedDate = new Date(parseInt(task.date_closed || task.date_done))
      const _isTaskInTimeRange = _closedDate >= startDate && _closedDate <= endDate
      const _isParentTask = !task.parent
      const _isParentTaskPresentInList = task.parent && taskMap[task.parent]?.id
      const _isParentTaskClosed = _isParentTaskPresentInList && this.closedStatuses.includes(taskMap[task.parent]?.status?.status)
      const _isGettingCarriedOver = task.tags.find((tag) => tag.name === 'spillover-trigger')

      // if (task.id === '86cxreaym') {
      //   console.log({ tags: task.tags })
      //   console.log(`\nname: ${task.name}, _isTaskClosed: ${_isTaskClosed}, startDate: ${startDate}, endDate: ${endDate}, _closedDate: ${_closedDate}, _isTaskInTimeRange: ${_isTaskInTimeRange}, taskParent: ${task.parent}, _isParentTask: ${_isParentTask}, _isParentTaskPresentInList: ${_isParentTaskPresentInList}, _isParentTaskClosed: ${_isParentTaskClosed}, _isGettingCarriedOver: ${_isGettingCarriedOver}`)
      // }

      let _shouldProcessTask = false
      if(_isTaskClosed && _isTaskInTimeRange && _isParentTask && !_isGettingCarriedOver) {
        // process parent task
        _shouldProcessTask = true
      } else if (_isTaskClosed && _isTaskInTimeRange && !_isParentTask && !_isParentTaskPresentInList && !_isGettingCarriedOver) {
        // process task if it is not a parent task and it's parent task is not in the list
        _shouldProcessTask = true
      } 
      // else if (_isTaskClosed && _isTaskInTimeRange && !_isParentTask && _isParentTaskPresentInList && _isParentTaskClosed) {
      //   // process task if it is not a parent task, it's parent task is in the list and it's parent task is closed
      //   _shouldProcessTask = true
      // }

      if (_shouldProcessTask) {
        const name = task.name;

        const taskAssignees = task.assignees?.map((assignee) => assignee.username) || []
        const subtaskIds = taskMap[task.id]?.subtaskIds || []
        const subtaskAssignees = subtaskIds.map((subtaskId) => taskMap[subtaskId].assignees[0]?.username)
        const assignees = [...new Set([...taskAssignees, ...subtaskAssignees])]
        
        const categoryValueIdx = task.custom_fields.find(
          (field) => field.id === this.clickupHelper.getCustomFieldId(task.custom_fields, '📖 Category'),
        )?.value;
        let category = this.clickupHelper.getCustomFieldOptionValue(task.custom_fields, '📖 Category', categoryValueIdx) || 'Other';

        // Find if the task is a support ticket
        if (category === 'Other') {
          const _isSupportTicketTagPresent = task.tags.find((tag) => tag.name === 'support production ticket')
          const _categoryCustomFieldId = this.clickupHelper.getCustomFieldId(task.custom_fields, 'Category')
          const _categoryCustomFieldValueIdx = task.custom_fields.find(
            (field) => field.id === _categoryCustomFieldId,
          )?.value;
          const _categoryCustomFieldValue = this.clickupHelper.getCustomFieldOptionValue(task.custom_fields, 'Category', _categoryCustomFieldValueIdx)
          const _isSupportTicketCustomFieldPresent = _categoryCustomFieldValue === 'Support Production Tickets'

          category = _isSupportTicketTagPresent || _isSupportTicketCustomFieldPresent ? 'Support Tickets' : 'Other';
        }

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

  getCurrentAndNextSprint(sprints) {
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
    let next = null;

    for (let i = 0; i < sortedSprints.length; i++) {
      const sprint = sortedSprints[i];
      if (now >= sprint.start && now <= sprint.end) {
        current = sprint;
        next = sortedSprints[i + 1] || null;
        break;
      }

      // If now is before the first sprint
      if (now < sprint.start) {
        next = sprint;
        break;
      }
    }

    return { current, next };
  }

  async fetchLists() {
    const url = `${this.clickupBaseUrl}/folder/${this.CLICKUP_SPRINT_FOLDER_ID}/list`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data.lists;
}

  async fetchCurrentSprint() {
    const lists = await this.fetchLists();
    const { current, next } = this.getCurrentAndNextSprint(lists);

    return current.id;
  }

  async summarizeTasksByAssignee(listId) {
    console.log("Fetching tasks for list:", listId);
    const tasks = await this.fetchTasksByListId(listId, true);
    if (!tasks) {
      console.log("No tasks found");
      return null;
    }
    console.log("Tasks fetched:", tasks.length);

    const summary = {};

    // Helper function to process a single task
    const processTask = (task) => {
      console.log({ taskName: task.name, status: task.status?.status });
      if (!task.assignees || !Array.isArray(task.assignees)) return;

      task.assignees.forEach((assignee) => {
        const assigneeName = assignee.username;

        if (!summary[assigneeName]) {
          summary[assigneeName] = {
            tasks: [],
          };
        }

        if (!this.closedStatuses.includes(task.status?.status)) {
          summary[assigneeName].tasks.push({
            id: task.id,
            name: task.name,
            status: task.status?.status || "No Status",
            url: task.url,
            points: task.points,
            due_date: task.due_date,
          });
        }
      });
    };

    // Process all tasks in the response
    if (tasks && Array.isArray(tasks)) {
      tasks.forEach(processTask);
    }

    return summary;
  }
}

module.exports = ClickUpService;
