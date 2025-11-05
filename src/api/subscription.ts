import axios from 'axios';
import { SubscriptionPlan } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
  };
};

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlan;
  name: string;
  limits: {
    maxProjects: number | string; // 'unlimited' for Infinity
    maxMembersPerProject: number | string; // 'unlimited' for Infinity
  };
  monthlyPrice?: number;
  yearlyPrice?: number;
  yearlyFirstTimePrice?: number;
  price?: null;
}

export interface CurrentSubscription {
  plan: SubscriptionPlan;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  isFirstTimeSubscriber: boolean;
  limits: {
    maxProjects: number | string; // 'unlimited' for Infinity
    maxMembersPerProject: number | string; // 'unlimited' for Infinity
  };
}

export const subscriptionApi = {
  getPlans: async (): Promise<SubscriptionPlanInfo[]> => {
    const response = await axios.get(`${API_URL}/api/subscription/plans`);
    return response.data.data;
  },

  getCurrent: async (): Promise<CurrentSubscription> => {
    const response = await axios.get(`${API_URL}/api/subscription/current`, {
      headers: getAuthHeaders(),
    });
    return response.data.data;
  },

  createCheckoutSession: async (plan: SubscriptionPlan, period: 'monthly' | 'yearly') => {
    const response = await axios.post(
      `${API_URL}/api/subscription/create-checkout`,
      { plan, period },
      { headers: getAuthHeaders() }
    );
    return response.data.data;
  },
};

