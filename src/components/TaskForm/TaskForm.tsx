import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate } from '../../utils/dateUtils';
import './TaskForm.css';

interface TaskFormProps {
  task?: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onCancel }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 默认7天
    progress: 5, // 默认5%，便于直接拖动调整进度
    assignee: '',
    description: '',
    color: '#4a90e2',
  });

  useEffect(() => {
    if (task) {
      setFormData(task);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert(t('form.required'));
      return;
    }

    const taskToSave: Task = {
      id: task?.id || `task-${Date.now()}`,
      name: formData.name!,
      startDate: formData.startDate instanceof Date ? formData.startDate : new Date(formData.startDate),
      endDate: formData.endDate instanceof Date ? formData.endDate : new Date(formData.endDate),
      progress: task ? (formData.progress || 0) : (formData.progress !== undefined ? formData.progress : 5), // 新任务默认5%
      dependencies: formData.dependencies || [],
      color: formData.color || '#4a90e2',
      assignee: formData.assignee,
      description: formData.description,
    };

    onSave(taskToSave);
  };

  return (
    <div className="task-form-overlay" onClick={onCancel}>
      <div className="task-form" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? t('task.edit') : t('task.new')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('task.name')} *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('task.start.date')} *</label>
              <input
                type="date"
                value={formatDate(formData.startDate as Date, 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('task.end.date')} *</label>
              <input
                type="date"
                value={formatDate(formData.endDate as Date, 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('task.progress')}</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress !== undefined ? formData.progress : (task ? 0 : 5)}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label>{t('task.color')}</label>
              <input
                type="color"
                value={formData.color || '#4a90e2'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('task.assignee')}</label>
            <input
              type="text"
              value={formData.assignee || ''}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              placeholder={t('task.assignee.placeholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('task.description')}</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder={t('task.description.placeholder')}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              {t('form.cancel')}
            </button>
            <button type="submit" className="btn-save">
              {t('form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
