import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { ProjectRole } from '../middleware/projectPermission.js';

export interface ProjectMemberResponse {
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

export interface UpdateMemberRoleData {
  role: ProjectRole;
}

/**
 * 获取项目成员列表
 */
export const getProjectMembers = async (
  projectId: string,
  userId: string
): Promise<ProjectMemberResponse[]> => {
  // 验证用户有权限查看成员列表
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
  });

  if (!project) {
    throw new AppError('Project not found or insufficient permissions', 404);
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [
      { role: 'desc' }, // OWNER, ADMIN, EDITOR, VIEWER
      { createdAt: 'asc' },
    ],
  });

  return members.map(member => ({
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    role: member.role as ProjectRole,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    user: member.user,
  }));
};

/**
 * 获取用户在项目中的角色
 */
export const getUserProjectRole = async (
  projectId: string,
  userId: string
): Promise<ProjectRole | null> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return null;
  }

  // 如果是项目所有者
  if (project.userId === userId) {
    return ProjectRole.OWNER;
  }

  // 查找成员记录
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  return member ? (member.role as ProjectRole) : null;
};

/**
 * 检查用户是否有项目访问权限
 */
export const checkProjectAccess = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const role = await getUserProjectRole(projectId, userId);
  return role !== null;
};

/**
 * 更新成员权限
 */
export const updateMemberRole = async (
  projectId: string,
  targetUserId: string,
  updaterUserId: string,
  data: UpdateMemberRoleData
): Promise<ProjectMemberResponse> => {
  // 验证项目存在
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // 检查更新者权限（必须是ADMIN或OWNER）
  const updaterRole = await getUserProjectRole(projectId, updaterUserId);
  if (!updaterRole || (updaterRole !== ProjectRole.ADMIN && updaterRole !== ProjectRole.OWNER)) {
    throw new AppError('Insufficient permissions to update member role', 403);
  }

  // 不能将OWNER权限分配给非项目所有者
  if (data.role === ProjectRole.OWNER && project.userId !== targetUserId) {
    throw new AppError('Cannot assign OWNER role to non-owner', 400);
  }

  // 不能更新项目所有者的权限
  if (project.userId === targetUserId) {
    throw new AppError('Cannot update owner role', 400);
  }

  // 检查目标用户是否是成员
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  if (!existingMember) {
    throw new AppError('Member not found', 404);
  }

  // 更新成员权限
  const updatedMember = await prisma.projectMember.update({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
    data: {
      role: data.role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    id: updatedMember.id,
    projectId: updatedMember.projectId,
    userId: updatedMember.userId,
    role: updatedMember.role as ProjectRole,
    createdAt: updatedMember.createdAt,
    updatedAt: updatedMember.updatedAt,
    user: updatedMember.user,
  };
};

/**
 * 移除成员
 */
export const removeMember = async (
  projectId: string,
  targetUserId: string,
  removerUserId: string
): Promise<void> => {
  // 验证项目存在
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // 检查移除者权限（必须是ADMIN或OWNER）
  const removerRole = await getUserProjectRole(projectId, removerUserId);
  if (!removerRole || (removerRole !== ProjectRole.ADMIN && removerRole !== ProjectRole.OWNER)) {
    throw new AppError('Insufficient permissions to remove member', 403);
  }

  // 不能移除项目所有者
  if (project.userId === targetUserId) {
    throw new AppError('Cannot remove project owner', 400);
  }

  // 检查目标用户是否是成员
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  if (!existingMember) {
    throw new AppError('Member not found', 404);
  }

  // 检查移除后是否至少还有一个ADMIN或OWNER
  const remainingAdmins = await prisma.projectMember.count({
    where: {
      projectId,
      role: {
        in: [ProjectRole.ADMIN, ProjectRole.OWNER],
      },
    },
  });

  // 如果移除的是ADMIN，且移除后没有其他ADMIN/OWNER，则不允许移除
  if (
    existingMember.role === ProjectRole.ADMIN &&
    remainingAdmins <= 1 &&
    project.userId !== targetUserId
  ) {
    throw new AppError(
      'Cannot remove the last admin. Please promote another member to admin first.',
      400
    );
  }

  // 移除成员
  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });
};

