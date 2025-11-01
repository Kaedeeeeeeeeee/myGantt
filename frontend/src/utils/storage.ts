import { Task, Project } from '../types';

const PROJECTS_STORAGE_KEY = 'gantt-projects';
const TASKS_STORAGE_KEY = 'gantt-tasks';
const CURRENT_PROJECT_KEY = 'gantt-current-project';

// Project相关函数
export const saveProjects = (projects: Project[]): void => {
  try {
    const serialized = JSON.stringify(projects.map(project => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })));
    localStorage.setItem(PROJECTS_STORAGE_KEY, serialized);
  } catch (error) {
    console.error('保存项目失败:', error);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const serialized = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!serialized) return [];
    
    const projects = JSON.parse(serialized);
    return projects.map((project: any) => ({
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }));
  } catch (error) {
    console.error('加载项目失败:', error);
    return [];
  }
};

export const getCurrentProjectId = (): string | null => {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
};

export const setCurrentProjectId = (projectId: string): void => {
  localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
};

// Tasks相关函数（基于project）
export const saveTasks = (tasks: Task[], projectId: string): void => {
  try {
    const allTasks = loadAllTasks();
    allTasks[projectId] = tasks.map(task => ({
      ...task,
      startDate: task.startDate.toISOString(),
      endDate: task.endDate.toISOString(),
    }));
    const serialized = JSON.stringify(allTasks);
    localStorage.setItem(TASKS_STORAGE_KEY, serialized);
  } catch (error) {
    console.error('保存任务失败:', error);
  }
};

export const loadTasks = (projectId: string): Task[] => {
  try {
    const allTasks = loadAllTasks();
    const tasks = allTasks[projectId] || [];
    return tasks.map((task: any) => ({
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
    }));
  } catch (error) {
    console.error('加载任务失败:', error);
    return [];
  }
};

// 内部函数：加载所有项目的任务
const loadAllTasks = (): Record<string, any[]> => {
  try {
    const serialized = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!serialized) return {};
    return JSON.parse(serialized);
  } catch (error) {
    console.error('加载所有任务失败:', error);
    return {};
  }
};
