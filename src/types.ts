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

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
