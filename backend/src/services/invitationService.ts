import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { ProjectRole } from '../middleware/projectPermission.js';
import crypto from 'crypto';

export { ProjectRole };

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface CreateInvitationData {
  inviteeEmail: string;
  role: ProjectRole;
}

export interface InvitationResponse {
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

/**
 * 生成安全的邀请令牌
 */
const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * 检查邀请是否过期（默认7天）
 */
const getInvitationExpiry = (): Date => {
  const days = 7;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

/**
 * 创建项目邀请
 */
export const createInvitation = async (
  projectId: string,
  inviterId: string,
  data: CreateInvitationData
): Promise<InvitationResponse> => {
  // 1. 验证项目存在且邀请者有权限
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId: inviterId },
        { members: { some: { userId: inviterId, role: { in: ['ADMIN', 'OWNER'] } } } },
      ],
    },
  });

  if (!project) {
    throw new AppError('Project not found or insufficient permissions', 404);
  }

  // 2. 验证邀请邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.inviteeEmail)) {
    throw new AppError('Invalid email format', 400);
  }

  // 3. 检查用户是否已经是项目成员
  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      user: {
        email: data.inviteeEmail.toLowerCase(),
      },
    },
  });

  if (existingMember) {
    throw new AppError('User is already a member of this project', 400);
  }

  // 4. 检查是否有待处理的邀请
  const pendingInvitation = await prisma.projectInvitation.findFirst({
    where: {
      projectId,
      inviteeEmail: data.inviteeEmail.toLowerCase(),
      status: InvitationStatus.PENDING,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (pendingInvitation) {
    throw new AppError('An invitation already exists for this user', 400);
  }

  // 5. 验证角色权限（不能创建 OWNER 角色的邀请）
  if (data.role === ProjectRole.OWNER) {
    throw new AppError('Cannot invite users with OWNER role', 400);
  }

  // 6. 创建邀请
  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiry();

  const invitation = await prisma.projectInvitation.create({
    data: {
      projectId,
      inviterId,
      inviteeEmail: data.inviteeEmail.toLowerCase().trim(),
      role: data.role,
      token,
      expiresAt,
      status: InvitationStatus.PENDING,
    },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return invitation as InvitationResponse;
};

/**
 * 通过令牌获取邀请详情
 */
export const getInvitationByToken = async (token: string) => {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { token },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  // 检查邀请是否过期
  if (invitation.expiresAt < new Date()) {
    // 更新状态为过期
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.EXPIRED },
    });
    throw new AppError('Invitation has expired', 410);
  }

  // 检查邀请状态
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(`Invitation has been ${invitation.status.toLowerCase()}`, 400);
  }

  return invitation;
};

/**
 * 接受邀请
 */
export const acceptInvitation = async (token: string, userId: string) => {
  // 1. 获取邀请详情
  const invitation = await getInvitationByToken(token);

  // 2. 验证用户邮箱匹配
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
    throw new AppError('This invitation was not sent to your email address', 403);
  }

  // 3. 检查用户是否已经是成员
  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId: invitation.projectId,
      userId,
    },
  });

  if (existingMember) {
    // 如果已经是成员，直接标记邀请为已接受
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });
    return {
      message: 'You are already a member of this project',
      projectId: invitation.projectId,
    };
  }

  // 4. 使用事务创建成员并更新邀请状态
  const result = await prisma.$transaction(async (tx) => {
    // 创建项目成员
    await tx.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
      },
    });

    // 更新邀请状态
    await tx.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    // 取消同一邮箱的其他待处理邀请
    await tx.projectInvitation.updateMany({
      where: {
        projectId: invitation.projectId,
        inviteeEmail: invitation.inviteeEmail,
        status: InvitationStatus.PENDING,
        id: { not: invitation.id },
      },
      data: { status: InvitationStatus.CANCELLED },
    });

    return {
      projectId: invitation.projectId,
      role: invitation.role,
    };
  });

  return result;
};

/**
 * 拒绝邀请
 */
export const rejectInvitation = async (token: string, userId: string) => {
  // 1. 获取邀请详情
  const invitation = await getInvitationByToken(token);

  // 2. 验证用户邮箱匹配
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
    throw new AppError('This invitation was not sent to your email address', 403);
  }

  // 3. 更新邀请状态
  await prisma.projectInvitation.update({
    where: { id: invitation.id },
    data: { status: InvitationStatus.REJECTED },
  });

  return {
    message: 'Invitation rejected',
    projectId: invitation.projectId,
  };
};

/**
 * 取消邀请（仅邀请者或项目管理员可以取消）
 */
export const cancelInvitation = async (invitationId: string, userId: string) => {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
    include: {
      project: true,
    },
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  // 检查权限：邀请者本人、项目所有者或管理员
  const isInviter = invitation.inviterId === userId;
  const isOwner = invitation.project.userId === userId;
  const isAdmin = await prisma.projectMember.findFirst({
    where: {
      projectId: invitation.projectId,
      userId,
      role: { in: [ProjectRole.ADMIN, ProjectRole.OWNER] },
    },
  });

  if (!isInviter && !isOwner && !isAdmin) {
    throw new AppError('Insufficient permissions to cancel invitation', 403);
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError('Only pending invitations can be cancelled', 400);
  }

  await prisma.projectInvitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.CANCELLED },
  });

  return {
    message: 'Invitation cancelled',
  };
};

/**
 * 获取项目的所有邀请
 */
export const getProjectInvitations = async (projectId: string, userId: string) => {
  // 验证用户有权限查看邀请
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } },
      ],
    },
  });

  if (!project) {
    throw new AppError('Project not found or insufficient permissions', 404);
  }

  const invitations = await prisma.projectInvitation.findMany({
    where: {
      projectId,
      status: { in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED] },
    },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return invitations;
};

/**
 * 获取用户的所有待处理邀请
 */
export const getUserPendingInvitations = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const invitations = await prisma.projectInvitation.findMany({
    where: {
      inviteeEmail: user.email.toLowerCase(),
      status: InvitationStatus.PENDING,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return invitations;
};

/**
 * 清理过期邀请（可以设置为定时任务）
 */
export const cleanupExpiredInvitations = async () => {
  const result = await prisma.projectInvitation.updateMany({
    where: {
      status: InvitationStatus.PENDING,
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: InvitationStatus.EXPIRED,
    },
  });

  return {
    updated: result.count,
  };
};

