import apiClient from './client';
import { Task } from '../types';

export interface CreateTaskData {
  name: string;
  startDate: Date;
  endDate: Date;
  progress?: number;
  color?: string;
  assignee?: string;
  description?: string;
  dependencies?: string[];
}

export interface UpdateTaskData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  progress?: number;
  color?: string;
  assignee?: string;
  description?: string;
  dependencies?: string[];
}

export const taskApi = {
  getByProjectId: async (projectId: string): Promise<Task[]> => {
    const response = await apiClient.get(`/api/tasks/projects/${projectId}/tasks`);
    return response.data.data.map((task: any) => ({
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      dependencies: task.dependencies || [],
    }));
  },

  getById: async (id: string): Promise<Task> => {
    const response = await apiClient.get(`/api/tasks/${id}`);
    const task = response.data.data;
    return {
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      dependencies: task.dependencies || [],
    };
  },

  create: async (projectId: string, data: CreateTaskData): Promise<Task> => {
    const response = await apiClient.post(`/api/tasks/projects/${projectId}/tasks`, {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    });
    const task = response.data.data;
    return {
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      dependencies: task.dependencies || [],
    };
  },

  update: async (id: string, data: UpdateTaskData): Promise<Task> => {
    const payload: any = { ...data };
    if (data.startDate) {
      payload.startDate = data.startDate.toISOString();
    }
    if (data.endDate) {
      payload.endDate = data.endDate.toISOString();
    }
    const response = await apiClient.put(`/api/tasks/${id}`, payload);
    const task = response.data.data;
    return {
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      dependencies: task.dependencies || [],
    };
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/tasks/${id}`);
  },
};

