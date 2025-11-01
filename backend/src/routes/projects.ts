import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllProjects,
  getProject,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from '../controllers/projectController.js';
import {
  createInvitationHandler,
  getProjectInvitationsHandler,
} from '../controllers/invitationController.js';
import {
  getProjectMembersHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
} from '../controllers/memberController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllProjects);
router.post('/', createProjectHandler);
router.get('/:id', getProject);
router.put('/:id', updateProjectHandler);
router.delete('/:id', deleteProjectHandler);

// 邀请相关路由
router.post('/:projectId/invitations', createInvitationHandler);
router.get('/:projectId/invitations', getProjectInvitationsHandler);

// 成员管理路由
router.get('/:projectId/members', getProjectMembersHandler);
router.put('/:projectId/members/:userId', updateMemberRoleHandler);
router.delete('/:projectId/members/:userId', removeMemberHandler);

export default router;

