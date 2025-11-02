import React, { useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { feedbackApi } from '../../api/feedback';
import './FeedbackModal.css';

interface FeedbackModalProps {
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !content.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await feedbackApi.send({
        subject: subject.trim(),
        content: content.trim(),
      });
      
      setSubmitted(true);
      
      // 3秒后自动关闭
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || t('feedback.error.send'));
    } finally {
      setIsLoading(false);
    }
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
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              {t('form.cancel')}
            </button>
            <button
              type="submit"
              disabled={!subject.trim() || !content.trim() || isLoading}
              className="btn-primary"
            >
              {isLoading ? t('feedback.sending') : t('feedback.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

