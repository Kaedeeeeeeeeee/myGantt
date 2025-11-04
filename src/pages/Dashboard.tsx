import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, ViewMode, Project, ProjectRole } from '../types';
import { GanttChart, GanttChartRef } from '../components/GanttChart/GanttChart';
import { TaskForm } from '../components/TaskForm/TaskForm';
import { LanguageSwitcher } from '../components/LanguageSwitcher/LanguageSwitcher';
import { ProjectMembers } from '../components/ProjectMembers/ProjectMembers';
import { UserMenu } from '../components/UserMenu/UserMenu';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { projectApi } from '../api/projects';
import { taskApi } from '../api/tasks';
import { memberApi } from '../api/members';
import { addDays, subDays } from 'date-fns';
import '../App.css';

const DEFAULT_START_DATE = subDays(new Date(), 30);
const DEFAULT_END_DATE = addDays(new Date(), 90);
const BUFFER_DAYS = 90;
const CURRENT_PROJECT_KEY = 'gantt-current-project';

function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  });
  const [viewMode] = useState<ViewMode>('day');
  const [manualStartDate, setManualStartDate] = useState<Date | null>(null);
  const [manualEndDate, setManualEndDate] = useState<Date | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showPermissionToast, setShowPermissionToast] = useState(false);
  const ganttChartRef = useRef<GanttChartRef>(null);
  const hasAutoScrolledRef = useRef(false);
  const isDeletingRef = useRef<string | null>(null);

  // Fetch projects
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
  });

  // Fetch tasks for current project
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery<Task[]>({
    queryKey: ['tasks', currentProjectId],
    queryFn: () => taskApi.getByProjectId(currentProjectId!),
    enabled: !!currentProjectId,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: projectApi.create,
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCurrentProjectIdState(newProject.id);
      localStorage.setItem(CURRENT_PROJECT_KEY, newProject.id);
      setNewProjectName('');
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      projectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: projectApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (projects.length === 1) {
        setCurrentProjectIdState(null);
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      } else if (currentProjectId) {
        const remainingProjects = projects.filter((p) => p.id !== currentProjectId);
        if (remainingProjects.length > 0) {
          setCurrentProjectIdState(remainingProjects[0].id);
          localStorage.setItem(CURRENT_PROJECT_KEY, remainingProjects[0].id);
        }
      }
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      taskApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
    },
  });

  // Update task mutation with optimistic update
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => taskApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // 取消任何正在进行的查询，避免覆盖我们的乐观更新
      await queryClient.cancelQueries({ queryKey: ['tasks', currentProjectId] });
      
      // 保存当前的任务快照
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', currentProjectId]);
      
      // 乐观更新：立即更新UI
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks', currentProjectId], (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...data,
                  startDate: data.startDate ? new Date(data.startDate) : task.startDate,
                  endDate: data.endDate ? new Date(data.endDate) : task.endDate,
                }
              : task
          );
        });
      }
      
      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      // 如果更新失败，回滚到之前的状态
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', currentProjectId], context.previousTasks);
      }
    },
    onSuccess: () => {
      // 成功后再刷新一次以确保数据同步
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
    },
  });

  // Initialize projects - create default if empty
  useEffect(() => {
    if (!projectsLoading && projects.length === 0 && !createProjectMutation.isPending) {
      createProjectMutation.mutate({ name: t('project.default') });
    }
  }, [projectsLoading, projects.length]);

  // Set current project from saved preference or first project
  useEffect(() => {
    if (!projectsLoading && projects.length > 0) {
      // 优先检查location.state中的selectedProjectId（来自邀请链接）
      const state = location.state as { selectedProjectId?: string } | null;
      if (state?.selectedProjectId && projects.some(p => p.id === state.selectedProjectId)) {
        setCurrentProjectIdState(state.selectedProjectId);
        localStorage.setItem(CURRENT_PROJECT_KEY, state.selectedProjectId);
        // 清除location.state，避免下次刷新时重复选择
        window.history.replaceState({}, '');
        return;
      }

      const savedId = localStorage.getItem(CURRENT_PROJECT_KEY);
      if (savedId && projects.some((p) => p.id === savedId)) {
        if (currentProjectId !== savedId) {
          setCurrentProjectIdState(savedId);
        }
      } else {
        // 优先选择我的项目（OWNER角色），否则选择第一个项目
        const myProjects = projects.filter(p => p.userRole === 'OWNER');
        const targetProject = myProjects.length > 0 ? myProjects[0] : projects[0];
        setCurrentProjectIdState(targetProject.id);
        localStorage.setItem(CURRENT_PROJECT_KEY, targetProject.id);
      }
    }
  }, [projectsLoading, projects, location.state, currentProjectId]);

  // Reset auto-scroll when project changes
  useEffect(() => {
    if (currentProjectId) {
      hasAutoScrolledRef.current = false;
    }
  }, [currentProjectId]);

  // Compute date range
  const computedDateRange = useMemo(() => {
    if (tasks.length === 0) {
      return {
        startDate: DEFAULT_START_DATE,
        endDate: DEFAULT_END_DATE,
      };
    }

    let earliestDate = tasks[0].startDate;
    let latestDate = tasks[0].endDate;

    tasks.forEach((task) => {
      if (task.startDate < earliestDate) {
        earliestDate = task.startDate;
      }
      if (task.endDate > latestDate) {
        latestDate = task.endDate;
      }
    });

    const computedStart = subDays(earliestDate, BUFFER_DAYS);
    const computedEnd = addDays(latestDate, BUFFER_DAYS);

    return {
      startDate: computedStart,
      endDate: computedEnd,
    };
  }, [tasks]);

  const startDate = manualStartDate || computedDateRange.startDate;
  const endDate = manualEndDate || computedDateRange.endDate;

  // Auto-scroll to today on initial load
  useEffect(() => {
    if (ganttChartRef.current && !hasAutoScrolledRef.current && startDate && endDate && !tasksLoading) {
      const timer = setTimeout(() => {
        if (ganttChartRef.current && !hasAutoScrolledRef.current) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (ganttChartRef.current && !hasAutoScrolledRef.current) {
                ganttChartRef.current.scrollToDate(new Date());
                hasAutoScrolledRef.current = true;
              }
            }, 100);
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, tasksLoading]);

  // 清理防抖定时器（组件卸载时）
  useEffect(() => {
    return () => {
      Object.values(updateTaskDebounceRef.current).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProjectDropdown && !target.closest('.project-selector')) {
        setShowProjectDropdown(false);
      }
    };

    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProjectDropdown]);

  const handleDateRangeExtend = (direction: 'start' | 'end', days: number = 30) => {
    if (direction === 'start') {
      setManualStartDate(subDays(startDate, days));
    } else {
      setManualEndDate(addDays(endDate, days));
    }
  };

  // 使用ref来存储防抖定时器
  const updateTaskDebounceRef = useRef<{ [taskId: string]: number }>({});

  const handleTaskUpdate = (updatedTask: Task) => {
    if (!currentProjectId) return;
    
    // 检查权限
    if (!canEdit) {
      setShowPermissionToast(true);
      return;
    }
    
    const taskId = updatedTask.id;
    
    // 清除之前的定时器（如果存在）
    if (updateTaskDebounceRef.current[taskId]) {
      clearTimeout(updateTaskDebounceRef.current[taskId]);
    }
    
    // 立即进行乐观更新（通过TaskBar的本地状态已经处理了UI更新）
    // 这里我们使用防抖来减少API请求频率
    updateTaskDebounceRef.current[taskId] = setTimeout(() => {
      updateTaskMutation.mutate({
        id: taskId,
        data: {
          startDate: updatedTask.startDate,
          endDate: updatedTask.endDate,
          progress: updatedTask.progress,
        },
      });
      
      // 清理定时器引用
      delete updateTaskDebounceRef.current[taskId];
    }, 300); // 300ms防抖延迟，平衡响应性和请求频率
  };

  const handleTaskSave = (task: Task) => {
    if (!currentProjectId) return;

    // 检查权限
    if (!canEdit) {
      setShowPermissionToast(true);
      return;
    }

    if (editingTask && editingTask.id === task.id) {
      // Update existing task
      updateTaskMutation.mutate({
        id: task.id,
        data: {
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: task.progress,
          color: task.color,
          assignee: task.assignee,
          description: task.description,
          dependencies: task.dependencies || [],
        },
      });
    } else {
      // Create new task
      createTaskMutation.mutate({
        projectId: currentProjectId,
        data: {
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: task.progress || 5,
          color: task.color || '#4a90e2',
          assignee: task.assignee,
          description: task.description,
          dependencies: task.dependencies || [],
        },
      });
    }

    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleTaskFormCancel = () => {
    if (editingTask) {
      const taskExists = tasks.some((t) => t.id === editingTask.id);
      if (taskExists && editingTask.name === t('task.new.default')) {
        deleteTaskMutation.mutate(editingTask.id);
      }
    }
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleTaskDelete = (taskId: string) => {
    if (isDeletingRef.current) return;

    // 检查权限
    if (!canEdit) {
      setShowPermissionToast(true);
      return;
    }

    isDeletingRef.current = taskId;
    const shouldDelete = window.confirm(t('task.delete.confirm'));

    if (shouldDelete) {
      deleteTaskMutation.mutate(taskId);
    }

    setTimeout(() => {
      isDeletingRef.current = null;
    }, 1000);
  };

  const handleNewTask = () => {
    // 检查权限
    if (!canEdit) {
      setShowPermissionToast(true);
      return;
    }
    
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    // 检查权限
    if (!canEdit) {
      setShowPermissionToast(true);
      return;
    }
    
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskCreateFromDrag = (task: Task) => {
    if (!currentProjectId) return;
    
    // 检查权限
    if (!canEdit) {
      setShowPermissionToast(true);
      return;
    }

    const defaultAssignee =
      user && (user.name || user.email)
        ? user.name || user.email
        : '';
    const taskWithAssignee: Task = {
      ...task,
      assignee: task.assignee || (defaultAssignee || undefined),
    };

    createTaskMutation.mutate({
      projectId: currentProjectId,
      data: {
        name: taskWithAssignee.name,
        startDate: taskWithAssignee.startDate,
        endDate: taskWithAssignee.endDate,
        progress: taskWithAssignee.progress || 5,
        color: taskWithAssignee.color || '#4a90e2',
        assignee: taskWithAssignee.assignee,
        description: taskWithAssignee.description,
        dependencies: taskWithAssignee.dependencies || [],
      },
    });
    setEditingTask(taskWithAssignee);
    setShowTaskForm(true);
  };

  // 自动隐藏权限提示 Toast
  useEffect(() => {
    if (showPermissionToast) {
      const timer = setTimeout(() => {
        setShowPermissionToast(false);
      }, 2000); // 2秒后自动隐藏
      return () => clearTimeout(timer);
    }
  }, [showPermissionToast]);

  const handleProjectChange = (projectId: string) => {
    setCurrentProjectIdState(projectId);
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    setShowProjectDropdown(false);
  };

  const handleCreateProject = () => {
    const name = newProjectName.trim() || `${t('project.name')} ${projects.length + 1}`;
    createProjectMutation.mutate({ name });
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length === 1) {
      alert(t('project.delete.min'));
      return;
    }
    if (window.confirm(t('project.delete.confirm'))) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setEditingProjectId(null);
      setEditingProjectName('');
      return;
    }
    updateProjectMutation.mutate({
      id: projectId,
      data: { name: trimmedName },
    });
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const currentProject = projects.find((p) => p.id === currentProjectId);

  // 将项目分成两组：我的项目（OWNER）和被邀请的项目（非OWNER）
  const myProjects = useMemo(() => {
    return projects.filter(p => p.userRole === 'OWNER');
  }, [projects]);

  const invitedProjects = useMemo(() => {
    return projects.filter(p => p.userRole !== 'OWNER');
  }, [projects]);

  // Fetch current project's user role
  const { data: currentProjectRole } = useQuery<ProjectRole | undefined>({
    queryKey: ['projectRole', currentProjectId],
    queryFn: async (): Promise<ProjectRole | undefined> => {
      if (!currentProjectId || !user) return undefined;
      const members = await memberApi.getProjectMembers(currentProjectId);
      
      // Check if user is project owner (need to check project API response)
      const project = await projectApi.getById(currentProjectId);
      if ((project as any).userId === user.id) {
        return 'OWNER' as ProjectRole;
      }
      
      // Find user's member record
      const member = members.find(m => m.user.id === user.id);
      return member?.role || undefined;
    },
    enabled: !!currentProjectId && !!user,
  });

  const canEdit = currentProjectRole === 'EDITOR' || currentProjectRole === 'ADMIN' || currentProjectRole === 'OWNER';
  const canDeleteProject = currentProjectRole === 'OWNER';

  if (projectsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (projectsError) {
    // 如果是401错误（未授权），重定向到登录页面
    const errorStatus = (projectsError as any)?.response?.status;
    if (errorStatus === 401) {
      // apiClient的interceptor应该已经处理了重定向，但为了保险起见，我们也处理一下
      if (!user) {
        return <Navigate to="/login" replace />;
      }
    }
    
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div>Failed to load projects, please refresh and try again</div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
          style={{ padding: '8px 16px' }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>myGantt</h1>
          <div className="project-selector">
            <button
              className="project-selector-button"
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            >
              {currentProject?.name || t('project.select')}
              <span className="project-selector-arrow">▼</span>
            </button>
            {showProjectDropdown && (
              <div className="project-dropdown">
                <div className="project-dropdown-list">
                  {/* 我的项目 */}
                  {myProjects.length > 0 && (
                    <>
                      <div className="project-group-header">
                        {t('project.myProjects') || '我的项目'}
                      </div>
                      {myProjects.map((project) => (
                        <div
                          key={project.id}
                          className={`project-dropdown-item ${project.id === currentProjectId ? 'active' : ''}`}
                          onClick={() => handleProjectChange(project.id)}
                        >
                          {editingProjectId === project.id ? (
                            <input
                              className="project-rename-input"
                              value={editingProjectName}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEditingProjectName(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => {
                                handleRenameProject(project.id, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameProject(project.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingProjectId(null);
                                  setEditingProjectName('');
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="project-name">{project.name}</span>
                              <div className="project-actions">
                                <button
                                  className="project-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProjectId(project.id);
                                    setEditingProjectName(project.name);
                                  }}
                                  title={t('project.edit')}
                                >
                                  {t('project.edit')}
                                </button>
                                {canDeleteProject && (
                                  <button
                                    className="project-action-btn delete"
                                    onClick={(e) => handleDeleteProject(project.id, e)}
                                    title={t('project.delete')}
                                  >
                                    {t('project.delete')}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* 被邀请的项目 */}
                  {invitedProjects.length > 0 && (
                    <>
                      {myProjects.length > 0 && <div className="project-group-divider"></div>}
                      <div className="project-group-header">
                        {t('project.invitedProjects') || '被邀请的项目'}
                      </div>
                      {invitedProjects.map((project) => (
                        <div
                          key={project.id}
                          className={`project-dropdown-item ${project.id === currentProjectId ? 'active' : ''}`}
                          onClick={() => handleProjectChange(project.id)}
                        >
                          {editingProjectId === project.id ? (
                            <input
                              className="project-rename-input"
                              value={editingProjectName}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEditingProjectName(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => {
                                handleRenameProject(project.id, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameProject(project.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingProjectId(null);
                                  setEditingProjectName('');
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="project-name">{project.name}</span>
                              <div className="project-actions">
                                <button
                                  className="project-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProjectId(project.id);
                                    setEditingProjectName(project.name);
                                  }}
                                  title={t('project.edit')}
                                >
                                  {t('project.edit')}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* 如果没有项目 */}
                  {myProjects.length === 0 && invitedProjects.length === 0 && (
                    <div className="project-dropdown-empty">
                      {t('project.noProjects') || '暂无项目'}
                    </div>
                  )}
                </div>
                <div className="project-dropdown-footer">
                  <input
                    className="project-name-input"
                    placeholder={t('project.name.placeholder')}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newProjectName.trim()) {
                        handleCreateProject();
                      }
                    }}
                  />
                  <button className="btn-new-project" onClick={handleCreateProject}>
                    {t('project.new')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="header-right">
          {currentProjectId && currentProjectRole && (
            <button
              onClick={() => setShowMembersPanel(!showMembersPanel)}
              className={`btn-header ${showMembersPanel ? 'btn-members active' : 'btn-members'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Members</span>
            </button>
          )}
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      <main className="app-main">
        {/* Members Modal */}
        {showMembersPanel && currentProjectId && currentProject && (
          <div className="members-modal-overlay" onClick={() => setShowMembersPanel(false)}>
            <div className="members-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="members-modal-header">
                <h2>Project Members</h2>
                <button 
                  className="members-modal-close" 
                  onClick={() => setShowMembersPanel(false)}
                  title="Close"
                >
                  ×
                </button>
              </div>
              <ProjectMembers
                projectId={currentProjectId}
                projectName={currentProject.name}
                userRole={currentProjectRole}
              />
            </div>
          </div>
        )}
        <div className="date-range-controls">
          <div className="date-control">
            <label>{t('date.start')}:</label>
            <input
              type="date"
              value={formatDate(startDate, 'yyyy-MM-dd')}
              onChange={(e) => setManualStartDate(new Date(e.target.value))}
            />
          </div>
          <div className="date-control">
            <label>{t('date.end')}:</label>
            <input
              type="date"
              value={formatDate(endDate, 'yyyy-MM-dd')}
              onChange={(e) => setManualEndDate(new Date(e.target.value))}
            />
          </div>
          <div className="date-control">
            <button
              className="btn-today"
              onClick={() => {
                ganttChartRef.current?.scrollToDate(new Date());
              }}
              title={t('date.today')}
            >
              {t('date.today')}
            </button>
          </div>
        </div>

        {!currentProjectId ? (
          <div className="empty-state">
            <p>{t('empty.select.project')}</p>
          </div>
        ) : tasksLoading ? (
          <div className="empty-state">
            <p>Loading tasks...</p>
          </div>
        ) : tasksError ? (
          <div className="empty-state">
            <p>Failed to load tasks, please refresh and try again</p>
          </div>
        ) : (
          <GanttChart
            ref={ganttChartRef}
            tasks={tasks}
            startDate={startDate}
            endDate={endDate}
            viewMode={viewMode}
            onTaskUpdate={handleTaskUpdate}
            onDateRangeExtend={handleDateRangeExtend}
            onTaskClick={handleEditTask}
            onTaskDelete={handleTaskDelete}
            onNewTask={handleNewTask}
            onTaskCreateFromDrag={handleTaskCreateFromDrag}
            canEdit={canEdit}
          />
        )}
      </main>

      {showTaskForm && (
        <TaskForm 
          task={editingTask} 
          projectId={currentProjectId || undefined}
          currentUser={user}
          onSave={handleTaskSave} 
          onCancel={handleTaskFormCancel} 
        />
      )}

      {/* 权限提示 Toast */}
      {showPermissionToast && (
        <div className="permission-toast">
          {t('permission.denied')}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
