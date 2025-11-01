import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import {
  getProjectMembers,
  updateMemberRole,
  removeMember,
  UpdateMemberRoleData,
} from '../services/memberService.js';
import { ProjectRole } from '../middleware/projectPermission.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * 获取项目成员列表
 * GET /api/projects/:projectId/members
 */
export const getProjectMembersHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { projectId } = req.params;
    const members = await getProjectMembers(projectId, req.user.userId);

    res.json({
      status: 'success',
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新成员权限
 * PUT /api/projects/:projectId/members/:userId
 */
export const updateMemberRoleHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { projectId, userId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(ProjectRole).includes(role as ProjectRole)) {
      throw new AppError('Valid role is required', 400);
    }

    if (role === ProjectRole.OWNER) {
      throw new AppError('Cannot assign OWNER role via this endpoint', 400);
    }

    const data: UpdateMemberRoleData = {
      role: role as ProjectRole,
    };

    const updatedMember = await updateMemberRole(
      projectId,
      userId,
      req.user.userId,
      data
    );

    res.json({
      status: 'success',
      data: updatedMember,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 移除成员
 * DELETE /api/projects/:projectId/members/:userId
 */
export const removeMemberHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { projectId, userId } = req.params;
    await removeMember(projectId, userId, req.user.userId);

    res.json({
      status: 'success',
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

