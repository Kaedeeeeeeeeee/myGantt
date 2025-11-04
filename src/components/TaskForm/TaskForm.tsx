import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Task, ProjectMember, User } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate } from '../../utils/dateUtils';
import { memberApi } from '../../api/members';
import './TaskForm.css';

interface TaskFormProps {
  task?: Task;
  projectId?: string;
  currentUser?: User | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, projectId, currentUser, onSave, onCancel }) => {
  const { t } = useI18n();
  
  // 调试日志：组件渲染时打印props
  console.log('[TaskForm] Component rendered:', {
    task: task ? `Task(${task.id})` : 'null',
    projectId,
    currentUser: currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : 'null',
  });
  
  // 获取项目成员列表（包含项目所有者，因为createProject会将所有者添加到ProjectMember表中）
  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['projectMembers', projectId],
    queryFn: () => memberApi.getProjectMembers(projectId!),
    enabled: !!projectId,
  });

  // 计算默认负责人（优先使用name，否则使用email）
  const getDefaultAssignee = (): string => {
    if (!currentUser) {
      console.log('[TaskForm] getDefaultAssignee: currentUser is null');
      return '';
    }
    const assignee = currentUser.name || currentUser.email || '';
    console.log('[TaskForm] getDefaultAssignee:', assignee);
    return assignee;
  };

  const [formData, setFormData] = useState<Partial<Task>>(() => {
    // 初始化时，如果是创建新任务且currentUser可用，设置默认负责人
    const defaultAssignee = !task && currentUser ? (currentUser.name || currentUser.email || '') : '';
    console.log('[TaskForm] useState init:', {
      isNewTask: !task,
      currentUser: currentUser ? 'exists' : 'null',
      defaultAssignee,
      taskAssignee: task?.assignee,
    });
    
    return {
      name: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      progress: 5,
      assignee: task?.assignee || defaultAssignee,
      description: '',
      color: '#4a90e2',
    };
  });

  useEffect(() => {
    console.log('[TaskForm] useEffect triggered:', {
      task: task ? `Task(${task.id})` : 'null',
      currentUser: currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : 'null',
      currentFormDataAssignee: formData.assignee,
    });
    
    if (task) {
      // 编辑现有任务，使用任务的assignee
      console.log('[TaskForm] Editing task, setting assignee to:', task.assignee);
      setFormData(task);
    } else {
      // 创建新任务，默认设置创建人为负责人
      const defaultAssignee = getDefaultAssignee();
      console.log('[TaskForm] Creating new task, defaultAssignee:', defaultAssignee);
      // 只有当defaultAssignee有值时才更新，避免覆盖用户已选择的值
      if (defaultAssignee) {
        console.log('[TaskForm] Updating formData with defaultAssignee:', defaultAssignee);
        setFormData(prev => {
          const updated = {
            ...prev,
            name: '',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            progress: 5,
            assignee: defaultAssignee,
            description: '',
            color: '#4a90e2',
          };
          console.log('[TaskForm] setFormData updated assignee to:', updated.assignee);
          return updated;
        });
      } else {
        console.log('[TaskForm] defaultAssignee is empty, not updating');
      }
    }
  }, [task, currentUser]);

  // 调试日志：formData变化时打印
  useEffect(() => {
    console.log('[TaskForm] formData.assignee changed to:', formData.assignee);
  }, [formData.assignee]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 如果按下回车键
    if (e.key === 'Enter') {
      // 如果焦点在 textarea 中，允许默认行为（换行）
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }
      // 如果焦点在其他输入框中，阻止默认行为并提交表单
      e.preventDefault();
      // 创建表单提交事件来触发 handleSubmit
      const form = e.currentTarget;
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    }
    // 如果按下 ESC 键，取消
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="task-form-overlay" onClick={onCancel}>
      <div className="task-form" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? t('task.edit') : t('task.new')}</h2>
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
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
            <select
              value={formData.assignee || ''}
              onChange={(e) => {
                console.log('[TaskForm] Assignee changed to:', e.target.value);
                setFormData({ ...formData, assignee: e.target.value });
              }}
            >
              <option value="">-- {t('task.assignee.select') || '请选择负责人'} --</option>
              {(() => {
                console.log('[TaskForm] Rendering members dropdown:', {
                  membersCount: members.length,
                  members: members.map(m => ({ userId: m.userId, displayName: m.user.name || m.user.email })),
                  currentAssignee: formData.assignee,
                });
                return members.map((member) => {
                  const displayName = member.user.name || member.user.email;
                  return (
                    <option key={member.userId} value={displayName}>
                      {displayName}
                    </option>
                  );
                });
              })()}
            </select>
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
