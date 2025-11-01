import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import {
  createInvitation,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  getProjectInvitations,
  getUserPendingInvitations,
  getInvitationByToken,
  ProjectRole,
} from '../services/invitationService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * 创建项目邀请
 * POST /api/projects/:projectId/invitations
 */
export const createInvitationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { projectId } = req.params;
    const { inviteeEmail, role } = req.body;

    if (!inviteeEmail || typeof inviteeEmail !== 'string') {
      throw new AppError('Invitee email is required', 400);
    }

    if (!role || !Object.values(ProjectRole).includes(role as ProjectRole)) {
      throw new AppError('Valid role is required', 400);
    }

    if (role === ProjectRole.OWNER) {
      throw new AppError('Cannot invite users with OWNER role', 400);
    }

    const invitation = await createInvitation(
      projectId,
      req.user.userId,
      {
        inviteeEmail: inviteeEmail.trim(),
        role: role as ProjectRole,
      }
    );

    res.status(201).json({
      status: 'success',
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取邀请详情（通过令牌）
 * GET /api/invitations/:token
 */
export const getInvitationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;
    const invitation = await getInvitationByToken(token);

    res.json({
      status: 'success',
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 接受邀请
 * POST /api/invitations/:token/accept
 */
export const acceptInvitationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { token } = req.params;
    const result = await acceptInvitation(token, req.user.userId);

    res.json({
      status: 'success',
      data: result,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 拒绝邀请
 * POST /api/invitations/:token/reject
 */
export const rejectInvitationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { token } = req.params;
    const result = await rejectInvitation(token, req.user.userId);

    res.json({
      status: 'success',
      data: result,
      message: 'Invitation rejected',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 取消邀请
 * DELETE /api/invitations/:id
 */
export const cancelInvitationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const result = await cancelInvitation(id, req.user.userId);

    res.json({
      status: 'success',
      data: result,
      message: 'Invitation cancelled',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取项目的所有邀请
 * GET /api/projects/:projectId/invitations
 */
export const getProjectInvitationsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { projectId } = req.params;
    const invitations = await getProjectInvitations(projectId, req.user.userId);

    res.json({
      status: 'success',
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户的待处理邀请
 * GET /api/invitations/pending
 */
export const getUserPendingInvitationsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const invitations = await getUserPendingInvitations(req.user.userId);

    res.json({
      status: 'success',
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

