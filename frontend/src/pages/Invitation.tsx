import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { invitationApi } from '../api/invitations';
import './Invitation.css';

export const Invitation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // 获取邀请详情
  const {
    data: invitation,
    isLoading,
    error: invitationError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationApi.getByToken(token!),
    enabled: !!token,
    retry: false,
  });

  // 接受邀请
  const acceptMutation = useMutation({
    mutationFn: () => invitationApi.accept(token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // 清除localStorage中的token
      localStorage.removeItem('pendingInvitationToken');
      navigate('/', { state: { selectedProjectId: invitation?.project.id } });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to accept invitation');
      // 如果接受失败，也清除token避免重复尝试
      localStorage.removeItem('pendingInvitationToken');
    },
  });

  // 拒绝邀请
  const rejectMutation = useMutation({
    mutationFn: () => invitationApi.reject(token!),
    onSuccess: () => {
      navigate('/', { state: { message: 'Invitation rejected' } });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to reject invitation');
    },
  });

  // 如果未登录，保存邀请token并重定向到登录页
  useEffect(() => {
    if (!user && !isLoading && invitation && token) {
      // 保存邀请token到localStorage，以便登录后自动处理
      localStorage.setItem('pendingInvitationToken', token);
      navigate('/login', { state: { returnTo: `/invitation/${token}` } });
    }
  }, [user, isLoading, invitation, navigate, token]);

  // 如果已登录且邮箱匹配，自动接受邀请
  useEffect(() => {
    if (user && invitation && !error) {
      const emailMatch = user.email.toLowerCase() === invitation.inviteeEmail.toLowerCase();
      if (emailMatch && !acceptMutation.isPending && !rejectMutation.isPending) {
        // 自动接受邀请
        acceptMutation.mutate();
        // 清除localStorage中的token
        localStorage.removeItem('pendingInvitationToken');
      }
    }
  }, [user, invitation, acceptMutation, rejectMutation, error]);

  if (isLoading) {
    return (
      <div className="invitation-container">
        <div className="invitation-card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (invitationError || !invitation) {
    return (
      <div className="invitation-container">
        <div className="invitation-card">
          <h1>Invitation Not Found</h1>
          <p>The invitation link is invalid or has expired.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 检查邮箱是否匹配
  const emailMatch = user?.email.toLowerCase() === invitation.inviteeEmail.toLowerCase();

  return (
    <div className="invitation-container">
      <div className="invitation-card">
        <h1>Project Invitation</h1>
        
        {error && <div className="error-message">{error}</div>}

        <div className="invitation-details">
          <div className="invitation-info">
            <h2>{invitation.project.name}</h2>
            <p className="inviter-info">
              <strong>{invitation.inviter.name || invitation.inviter.email}</strong> has invited you to join this project
            </p>
            <p className="role-info">
              Role: <span className="role-badge">{invitation.role}</span>
            </p>
            {invitation.expiresAt && (
              <p className="expiry-info">
                Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {!emailMatch && (
            <div className="warning-message">
              This invitation was sent to <strong>{invitation.inviteeEmail}</strong>.
              {user && (
                <span> You are currently logged in as <strong>{user.email}</strong>.</span>
              )}
            </div>
          )}
        </div>

        {user && emailMatch && (
          <div className="invitation-actions">
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
              className="btn-primary btn-accept"
            >
              {acceptMutation.isPending ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
              className="btn-secondary btn-reject"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}

        {!user && (
          <div className="invitation-actions">
            <button onClick={() => navigate('/login')} className="btn-primary">
              Sign In to Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

