import apiClient from './client';
import { ProjectMember, ProjectRole } from '../types';

export interface UpdateMemberRoleData {
  role: ProjectRole;
}

export const memberApi = {
  getProjectMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const response = await apiClient.get(`/api/projects/${projectId}/members`);
    return response.data.data.map((member: any) => ({
      ...member,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt),
    }));
  },

  updateMemberRole: async (
    projectId: string,
    userId: string,
    data: UpdateMemberRoleData
  ): Promise<ProjectMember> => {
    const response = await apiClient.put(`/api/projects/${projectId}/members/${userId}`, data);
    const member = response.data.data;
    return {
      ...member,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt),
    };
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/api/projects/${projectId}/members/${userId}`);
  },
};

