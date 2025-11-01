import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultMembers() {
  try {
    // 获取所有项目
    const projects = await prisma.project.findMany({
      include: {
        members: true,
      },
    });

    let created = 0;
    for (const project of projects) {
      // 检查是否已有成员记录
      const hasOwnerMember = project.members.some(
        (m) => m.userId === project.userId && m.role === 'OWNER'
      );

      if (!hasOwnerMember) {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: project.userId,
            role: 'OWNER',
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
        });
        created++;
        console.log(`Created OWNER member for project: ${project.name}`);
      }
    }

    console.log(`\n✅ Created ${created} default OWNER member records`);
  } catch (error) {
    console.error('Error creating default members:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultMembers();

