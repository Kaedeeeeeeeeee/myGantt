import apiClient from './client';

export interface FeedbackRequest {
  subject: string;
  content: string;
}

export const feedbackApi = {
  send: async (data: FeedbackRequest) => {
    const response = await apiClient.post('/api/feedback', data);
    return response.data;
  },
};



