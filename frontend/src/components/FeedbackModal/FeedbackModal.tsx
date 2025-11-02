import React, { useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import './FeedbackModal.css';

interface FeedbackModalProps {
  onClose: () => void;
}

const FEEDBACK_EMAIL = 'f.shera.09@gmail.com';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !content.trim()) {
      return;
    }

    // 构建邮件内容
    const userInfo = user ? `\n\n---\n${t('feedback.user.info')}:\n${t('feedback.user.name')}: ${user.name || t('feedback.user.name.notset')}\n${t('feedback.user.email')}: ${user.email}` : '';
    const emailBody = encodeURIComponent(content + userInfo);
    const emailSubject = encodeURIComponent(subject);
    
    // 使用 mailto: 链接打开邮件客户端
    const mailtoLink = `mailto:${FEEDBACK_EMAIL}?subject=${emailSubject}&body=${emailBody}`;
    window.location.href = mailtoLink;
    
    setSubmitted(true);
    
    // 3秒后自动关闭
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{t('feedback.success.title')}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="feedback-success">
            <p>{t('feedback.success.message')}</p>
            <div className="modal-actions">
              <button onClick={onClose} className="btn-primary">
                {t('form.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('feedback.title')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label htmlFor="subject">{t('feedback.subject')}</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('feedback.subject.placeholder')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="content">{t('feedback.content')}</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('feedback.content.placeholder')}
              rows={6}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('form.cancel')}
            </button>
            <button
              type="submit"
              disabled={!subject.trim() || !content.trim()}
              className="btn-primary"
            >
              {t('feedback.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

