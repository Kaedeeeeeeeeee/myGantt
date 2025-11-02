import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export const Login: React.FC = () => {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 监听邀请接受事件
  useEffect(() => {
    const handleInvitationAccepted = (event: CustomEvent) => {
      const { projectId } = event.detail;
      // 重定向到Dashboard并选中项目
      navigate('/', { state: { selectedProjectId: projectId }, replace: true });
    };

    window.addEventListener('invitationAccepted', handleInvitationAccepted as EventListener);
    return () => {
      window.removeEventListener('invitationAccepted', handleInvitationAccepted as EventListener);
    };
  }, [navigate]);

  // Redirect to home if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      // 等待一小段时间，让AuthContext有机会处理邀请
      const timer = setTimeout(() => {
        // 检查是否有待处理的邀请token
        const pendingInvitationToken = localStorage.getItem('pendingInvitationToken');
        if (pendingInvitationToken) {
          // 如果有邀请token，重定向到邀请页面，让Invitation页面处理自动接受
          navigate(`/invitation/${pendingInvitationToken}`, { replace: true });
        } else {
          // 检查是否有returnTo路径
          const state = location.state as { returnTo?: string } | null;
          if (state?.returnTo) {
            navigate(state.returnTo, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      }, 100); // 等待100ms，让AuthContext完成邀请处理

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate, location.state]);

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>myGantt</h1>
        <p className="login-subtitle">Sign in with your Google account to get started</p>
        <button className="btn-google-login" onClick={login}>
          <svg
            className="google-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

