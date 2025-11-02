import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '../../api/members';
import { invitationApi } from '../../api/invitations';
import { ProjectMember, ProjectRole } from '../../types';
import { InvitationModal } from '../InvitationModal/InvitationModal';
import { generateInvitationLink } from '../../utils/invitation';
import { useI18n } from '../../contexts/I18nContext';
import './ProjectMembers.css';

interface ProjectMembersProps {
  projectId: string;
  projectName: string;
  userRole?: ProjectRole;
}

export const ProjectMembers: React.FC<ProjectMembersProps> = ({
  projectId,
  projectName,
  userRole,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => memberApi.getProjectMembers(projectId),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['projectInvitations', projectId],
    queryFn: () => invitationApi.getProjectInvitations(projectId),
    enabled: userRole === 'ADMIN' || userRole === 'OWNER',
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      memberApi.updateMemberRole(projectId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => memberApi.removeMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => invitationApi.cancel(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] });
    },
  });

  const canManageMembers = userRole === 'ADMIN' || userRole === 'OWNER';

  const handleRoleChange = (member: ProjectMember, newRole: ProjectRole) => {
    if (member.role === newRole) return;
    updateRoleMutation.mutate({ userId: member.userId, role: newRole });
  };

  const handleRemoveMember = (member: ProjectMember) => {
    if (window.confirm(`Remove ${member.user.name || member.user.email} from this project?`)) {
      removeMemberMutation.mutate(member.userId);
    }
  };

  const handleCancelInvitation = (invitationId: string) => {
    if (window.confirm('Cancel this invitation?')) {
      cancelInvitationMutation.mutate(invitationId);
    }
  };

  // 计算剩余时间
  const getTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return '已过期';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}天${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  // 复制链接到剪贴板
  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      // 显示成功提示
      setShowCopyToast(true);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // 如果复制失败，可以尝试使用备用方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        // 显示成功提示
        setShowCopyToast(true);
      } catch (fallbackErr) {
        console.error('Fallback copy method also failed:', fallbackErr);
      }
    }
  };

  // 自动隐藏 Toast
  useEffect(() => {
    if (showCopyToast) {
      const timer = setTimeout(() => {
        setShowCopyToast(false);
      }, 2000); // 2秒后自动隐藏
      return () => clearTimeout(timer);
    }
  }, [showCopyToast]);

  if (isLoading) {
    return <div className="project-members-loading">Loading members...</div>;
  }

  return (
    <div className="project-members">
      <div className="project-members-header">
        {canManageMembers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-invite"
          >
            + Invite Member
          </button>
        )}
      </div>

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.name || member.user.email}
                  className="member-avatar"
                />
              ) : (
                <div className="member-avatar-placeholder">
                  {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="member-details">
                <div className="member-name">{member.user.name || member.user.email}</div>
                <div className="member-email">{member.user.email}</div>
              </div>
            </div>
            <div className="member-actions">
              {canManageMembers && (
                <>
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member, e.target.value as ProjectRole)
                    }
                    className="role-select"
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(member)}
                    className="btn-remove"
                    disabled={removeMemberMutation.isPending}
                    title="Remove member"
                  >
                    ×
                  </button>
                </>
              )}
              {!canManageMembers && (
                <span className="role-badge">{member.role}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManageMembers && invitations.length > 0 && (
        <div className="invitations-list">
          <h4>Pending Invitations</h4>
          {invitations.map((invitation) => {
            const invitationLink = generateInvitationLink(invitation.token);
            const timeRemaining = getTimeRemaining(invitation.expiresAt);
            return (
              <div key={invitation.id} className="invitation-item">
                <div className="invitation-info">
                  <div className="invitation-info-header">
                    <span className="invitation-email">{invitation.inviteeEmail}</span>
                    <span className="invitation-role">{invitation.role}</span>
                  </div>
                  <div className="invitation-link-section">
                    <span className="invitation-link">{invitationLink}</span>
                    <span className="invitation-expiry">剩余: {timeRemaining}</span>
                  </div>
                </div>
                <div className="invitation-actions">
                  <button
                    onClick={() => handleCopyLink(invitationLink)}
                    className="btn-copy-link"
                    title={t('common.copy')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="btn-cancel-invitation"
                    title="Cancel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInviteModal && (
        <InvitationModal
          projectId={projectId}
          projectName={projectName}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="copy-toast">
          Copied successfully
        </div>
      )}
    </div>
  );
};

