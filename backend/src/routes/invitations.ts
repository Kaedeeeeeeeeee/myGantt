import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getInvitationHandler,
  acceptInvitationHandler,
  rejectInvitationHandler,
  cancelInvitationHandler,
  getUserPendingInvitationsHandler,
} from '../controllers/invitationController.js';

const router = Router();

// 获取当前用户的待处理邀请（需要认证）
router.get('/pending', authenticate, getUserPendingInvitationsHandler as any);

// 通过令牌获取邀请详情（公开访问，用于查看邀请信息）
router.get('/:token', getInvitationHandler as any);

// 接受/拒绝邀请（需要认证）
router.post('/:token/accept', authenticate, acceptInvitationHandler as any);
router.post('/:token/reject', authenticate, rejectInvitationHandler as any);

// 取消邀请（需要认证）
router.delete('/:id', authenticate, cancelInvitationHandler as any);

export default router;

