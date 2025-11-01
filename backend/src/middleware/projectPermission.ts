import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';
import prisma from '../config/database.js';

export enum ProjectRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

const roleHierarchy: Record<ProjectRole, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.EDITOR]: 2,
  [ProjectRole.ADMIN]: 3,
  [ProjectRole.OWNER]: 4,
};

/**
 * 权限检查中间件
 * @param minRole 最小要求的权限级别
 */
export const requireProjectAccess = (minRole: ProjectRole = ProjectRole.VIEWER) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId || req.params.id;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      if (!projectId) {
        throw new AppError('Project ID is required', 400);
      }

      // 检查项目是否存在
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            where: { userId },
          },
        },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // 如果是项目所有者，自动拥有OWNER权限
      if (project.userId === userId) {
        req.projectRole = ProjectRole.OWNER;
        return next();
      }

      // 检查用户是否是项目成员
      const member = project.members[0];
      if (!member) {
        throw new AppError('Access denied', 403);
      }

      // 检查权限等级
      const userRoleLevel = roleHierarchy[member.role as ProjectRole];
      const requiredRoleLevel = roleHierarchy[minRole];

      if (userRoleLevel < requiredRoleLevel) {
        throw new AppError('Insufficient permissions', 403);
      }

      req.projectRole = member.role as ProjectRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

