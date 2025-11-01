import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { ProjectRole } from '../middleware/projectPermission.js';

export interface CreateProjectData {
  name: string;
}

export interface UpdateProjectData {
  name?: string;
}

export const getProjectsByUserId = async (userId: string) => {
  // 查询用户拥有的项目 + 作为成员的项目
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: {
        where: { userId },
        select: {
          role: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // 为每个项目添加用户角色信息
  return projects.map((project) => {
    // 如果用户是项目所有者
    if (project.userId === userId) {
      return {
        ...project,
        userRole: ProjectRole.OWNER,
      };
    }
    // 否则从members中获取角色
    const member = project.members[0];
    return {
      ...project,
      userRole: member ? member.role : null,
    };
  });
};

export const getProjectById = async (projectId: string, userId: string) => {
  // 支持通过成员权限访问
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
    throw new AppError('Project not found', 404);
  }

  return project;
};

export const createProject = async (userId: string, data: CreateProjectData) => {
  // 使用事务创建项目并自动创建OWNER成员记录
  return await prisma.$transaction(async (tx) => {
    // 创建项目
    const project = await tx.project.create({
      data: {
        userId,
        name: data.name,
      },
    });

    // 自动创建OWNER成员记录
    await tx.projectMember.create({
      data: {
        projectId: project.id,
        userId,
        role: ProjectRole.OWNER,
      },
    });

    return project;
  });
};

export const updateProject = async (
  projectId: string,
  userId: string,
  data: UpdateProjectData
) => {
  await getProjectById(projectId, userId);

  return await prisma.project.update({
    where: { id: projectId },
    data,
  });
};

export const deleteProject = async (projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);

  await prisma.project.delete({
    where: { id: projectId },
  });

  return project;
};

