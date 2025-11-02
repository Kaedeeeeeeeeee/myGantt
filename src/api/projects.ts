import apiClient from './client';
import { Project } from '../types';

export interface CreateProjectData {
  name: string;
}

export interface UpdateProjectData {
  name?: string;
}

export const projectApi = {
  getAll: async (): Promise<Project[]> => {
    const response = await apiClient.get('/api/projects');
    return response.data.data.map((project: any) => ({
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }));
  },

  getById: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/api/projects/${id}`);
    const project = response.data.data;
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    };
  },

  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await apiClient.post('/api/projects', data);
    const project = response.data.data;
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    };
  },

  update: async (id: string, data: UpdateProjectData): Promise<Project> => {
    const response = await apiClient.put(`/api/projects/${id}`, data);
    const project = response.data.data;
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    };
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/projects/${id}`);
  },
};

