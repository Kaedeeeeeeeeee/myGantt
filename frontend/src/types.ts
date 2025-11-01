export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  dependencies?: string[]; // 依赖的任务ID列表
  color?: string;
  assignee?: string;
  description?: string;
}

export interface GanttConfig {
  cellWidth: number;
  timeUnit: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
}

export type ViewMode = 'day' | 'week' | 'month';

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  dependencies?: string[]; // 依赖的任务ID列表
  color?: string;
  assignee?: string;
  description?: string;
}

export interface GanttConfig {
  cellWidth: number;
  timeUnit: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
}

export type ViewMode = 'day' | 'week' | 'month';

export type ProjectRole = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  inviteeEmail: string;
  role: ProjectRole;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  inviter: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  project: {
    id: string;
    name: string;
  };
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members?: ProjectMember[];
  userRole?: ProjectRole;
}
