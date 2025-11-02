import apiClient from './client';
import { ProjectInvitation, ProjectRole } from '../types';

export interface CreateInvitationData {
  inviteeEmail: string;
  role: ProjectRole;
}

export const invitationApi = {
  create: async (projectId: string, data: CreateInvitationData): Promise<ProjectInvitation> => {
    const response = await apiClient.post(`/api/projects/${projectId}/invitations`, data);
    const invitation = response.data.data;
    return {
      ...invitation,
      expiresAt: new Date(invitation.expiresAt),
      createdAt: new Date(invitation.createdAt),
      updatedAt: new Date(invitation.updatedAt),
    };
  },

  getByToken: async (token: string): Promise<ProjectInvitation> => {
    const response = await apiClient.get(`/api/invitations/${token}`);
    const invitation = response.data.data;
    return {
      ...invitation,
      expiresAt: new Date(invitation.expiresAt),
      createdAt: new Date(invitation.createdAt),
      updatedAt: new Date(invitation.updatedAt),
    };
  },

  accept: async (token: string): Promise<{ projectId: string; role: ProjectRole }> => {
    const response = await apiClient.post(`/api/invitations/${token}/accept`);
    return response.data.data;
  },

  reject: async (token: string): Promise<{ projectId: string }> => {
    const response = await apiClient.post(`/api/invitations/${token}/reject`);
    return response.data.data;
  },

  cancel: async (invitationId: string): Promise<void> => {
    await apiClient.delete(`/api/invitations/${invitationId}`);
  },

  getProjectInvitations: async (projectId: string): Promise<ProjectInvitation[]> => {
    const response = await apiClient.get(`/api/projects/${projectId}/invitations`);
    return response.data.data.map((invitation: any) => ({
      ...invitation,
      expiresAt: new Date(invitation.expiresAt),
      createdAt: new Date(invitation.createdAt),
      updatedAt: new Date(invitation.updatedAt),
    }));
  },

  getPendingInvitations: async (): Promise<ProjectInvitation[]> => {
    const response = await apiClient.get('/api/invitations/pending');
    return response.data.data.map((invitation: any) => ({
      ...invitation,
      expiresAt: new Date(invitation.expiresAt),
      createdAt: new Date(invitation.createdAt),
      updatedAt: new Date(invitation.updatedAt),
    }));
  },
};

