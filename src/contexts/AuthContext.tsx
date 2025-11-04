import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { invitationApi } from '../api/invitations';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Refresh access token periodically
  useEffect(() => {
    if (!refreshToken) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        logout();
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(refreshInterval);
  }, [refreshToken]);

  const refreshAccessToken = async () => {
    if (!refreshToken) return;

    try {
      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const newAccessToken = response.data.data.accessToken;
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Get user info from Google
        const userInfoResponse = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        const googleUser = userInfoResponse.data;

        // Send to backend
        const authResponse = await axios.post(`${API_URL}/api/auth/google`, {
          idToken: tokenResponse.access_token,
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        });

        const { user: authUser, accessToken: newAccessToken, refreshToken: newRefreshToken } =
          authResponse.data.data;

        setUser(authUser);
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);

        localStorage.setItem('user', JSON.stringify(authUser));
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // 检查是否有待处理的邀请token
        const pendingInvitationToken = localStorage.getItem('pendingInvitationToken');
        if (pendingInvitationToken) {
          try {
            // 获取邀请详情
            const invitation = await invitationApi.getByToken(pendingInvitationToken);
            
            // 检查邮箱是否匹配
            if (authUser.email.toLowerCase() === invitation.inviteeEmail.toLowerCase()) {
              // 自动接受邀请
              const result = await invitationApi.accept(pendingInvitationToken);
              // 清除token
              localStorage.removeItem('pendingInvitationToken');
              // 触发事件，让页面知道邀请已被接受
              window.dispatchEvent(new CustomEvent('invitationAccepted', { 
                detail: { projectId: result.projectId } 
              }));
            } else {
              // 邮箱不匹配，清除token，让用户手动处理
              localStorage.removeItem('pendingInvitationToken');
            }
          } catch (error) {
            // 如果邀请处理失败，清除token，避免重复尝试
            console.error('Failed to auto-accept invitation:', error);
            localStorage.removeItem('pendingInvitationToken');
          }
        }
      } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed, please try again');
      }
    },
    onError: () => {
      alert('Google login failed, please try again');
    },
  });

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // 清除待处理的邀请token
    localStorage.removeItem('pendingInvitationToken');

    // Call backend logout endpoint
    if (accessToken) {
      axios.post(`${API_URL}/api/auth/logout`, {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(console.error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoading,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

