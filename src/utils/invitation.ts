/**
 * 生成邀请链接
 */
export const generateInvitationLink = (token: string): string => {
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  return `${frontendUrl}/invitation/${token}`;
};

