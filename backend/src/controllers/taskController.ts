import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import {
  getTasksByProjectId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  CreateTaskData,
  UpdateTaskData,
} from '../services/taskService.js';
import { AppError } from '../middleware/errorHandler.js';

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const tasks = await getTasksByProjectId(req.params.projectId, req.user.userId);

    res.json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const task = await getTaskById(req.params.id, req.user.userId);

    res.json({
      status: 'success',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const createTaskHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const {
      name,
      startDate,
      endDate,
      progress,
      color,
      assignee,
      description,
      dependencies,
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Task name is required', 400);
    }

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format', 400);
    }

    if (start >= end) {
      throw new AppError('End date must be after start date', 400);
    }

    const taskData: CreateTaskData = {
      name: name.trim(),
      startDate: start,
      endDate: end,
      progress: progress ?? 0,
      color,
      assignee,
      description,
      dependencies,
    };

    const task = await createTask(req.params.projectId, req.user.userId, taskData);

    res.status(201).json({
      status: 'success',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const {
      name,
      startDate,
      endDate,
      progress,
      color,
      assignee,
      description,
      dependencies,
    } = req.body;

    const data: UpdateTaskData = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('Task name must be a non-empty string', 400);
      }
      data.name = name.trim();
    }

    if (startDate !== undefined) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new AppError('Invalid start date format', 400);
      }
      data.startDate = start;
    }

    if (endDate !== undefined) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new AppError('Invalid end date format', 400);
      }
      data.endDate = end;
    }

    if (progress !== undefined) {
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        throw new AppError('Progress must be between 0 and 100', 400);
      }
      data.progress = progress;
    }

    if (color !== undefined) {
      data.color = color;
    }

    if (assignee !== undefined) {
      data.assignee = assignee;
    }

    if (description !== undefined) {
      data.description = description;
    }

    if (dependencies !== undefined) {
      if (!Array.isArray(dependencies)) {
        throw new AppError('Dependencies must be an array', 400);
      }
      data.dependencies = dependencies;
    }

    const task = await updateTask(req.params.id, req.user.userId, data);

    res.json({
      status: 'success',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTaskHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    await deleteTask(req.params.id, req.user.userId);

    res.json({
      status: 'success',
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

