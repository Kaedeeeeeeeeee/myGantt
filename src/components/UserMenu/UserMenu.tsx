import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { FeedbackModal } from '../FeedbackModal/FeedbackModal';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../../api/subscription';
import { SubscriptionPlan } from '../../types';
import './UserMenu.css';

// Buy Me a Coffee 链接配置 - 可以从环境变量读取
const BUY_ME_A_COFFEE_URL = import.meta.env.VITE_BUY_ME_A_COFFEE_URL;

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 获取订阅信息
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getCurrent,
    enabled: !!user,
  });

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!user) {
    return null;
  }

  const handleBuyMeACoffee = () => {
    window.open(BUY_ME_A_COFFEE_URL, '_blank');
    setShowMenu(false);
  };

  const handleFeedback = () => {
    setShowFeedbackModal(true);
    setShowMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowMenu(false);
  };

  return (
    <div className="user-menu-container" ref={menuRef}>
      <div className="user-menu-header-wrapper">
        <button
          className="user-avatar-button"
          onClick={() => setShowMenu(!showMenu)}
          title={user.name || user.email}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || user.email}
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar-placeholder">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        {/* 订阅状态标签 */}
        {subscription?.plan === SubscriptionPlan.PRO && (
          <div className="subscription-badge subscription-badge-pro">
            PRO
          </div>
        )}
        {subscription?.plan === SubscriptionPlan.BASIC && (
          <div className="subscription-badge subscription-badge-basic">
            BASIC
          </div>
        )}
      </div>

      {showMenu && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-menu-name">{user.name || user.email}</div>
            <div className="user-menu-email">{user.email}</div>
          </div>
          
          {BUY_ME_A_COFFEE_URL && (
            <>
              <div className="user-menu-divider"></div>
              
              <button
                className="user-menu-item"
                onClick={handleBuyMeACoffee}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
                <span>Buy Me a Coffee</span>
              </button>
            </>
          )}
          
          <div className="user-menu-divider"></div>
          
          <button
            className="user-menu-item"
            onClick={handleFeedback}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{t('menu.feedback')}</span>
          </button>
          
          <div className="user-menu-divider"></div>
          
          <button
            className="user-menu-item user-menu-item-logout"
            onClick={handleLogout}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}

      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
};

