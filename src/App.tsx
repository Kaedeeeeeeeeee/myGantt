import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, ViewMode, Project } from './types';
import { GanttChart, GanttChartRef } from './components/GanttChart/GanttChart';
import { TaskForm } from './components/TaskForm/TaskForm';
import { LanguageSwitcher } from './components/LanguageSwitcher/LanguageSwitcher';
import { useI18n } from './contexts/I18nContext';
import { formatDate, getDaysBetween } from './utils/dateUtils';
import { loadTasks, saveTasks, loadProjects, saveProjects, getCurrentProjectId, setCurrentProjectId } from './utils/storage';
import { addDays, subDays } from 'date-fns';
import './App.css';

const DEFAULT_START_DATE = subDays(new Date(), 30);
const DEFAULT_END_DATE = addDays(new Date(), 90);
const BUFFER_DAYS = 90; // 前后各扩展90天作为缓冲区

function App() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [manualStartDate, setManualStartDate] = useState<Date | null>(null);
  const [manualEndDate, setManualEndDate] = useState<Date | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const ganttChartRef = useRef<GanttChartRef>(null);
  const hasAutoScrolledRef = useRef(false);
  const isDeletingRef = useRef<string | null>(null); // 记录正在删除的任务ID

  // 根据任务自动计算日期范围
  const computedDateRange = useMemo(() => {
    if (tasks.length === 0) {
      return {
        startDate: DEFAULT_START_DATE,
        endDate: DEFAULT_END_DATE,
      };
    }

    // 找到所有任务的最早开始日期和最晚结束日期
    let earliestDate = tasks[0].startDate;
    let latestDate = tasks[0].endDate;
    
    tasks.forEach(task => {
      if (task.startDate < earliestDate) {
        earliestDate = task.startDate;
      }
      if (task.endDate > latestDate) {
        latestDate = task.endDate;
      }
    });

    // 扩展日期范围，前后各加缓冲区
    const computedStart = subDays(earliestDate, BUFFER_DAYS);
    const computedEnd = addDays(latestDate, BUFFER_DAYS);

    return {
      startDate: computedStart,
      endDate: computedEnd,
    };
  }, [tasks]);

  // 使用手动设置的日期，如果没有则使用计算出的日期
  const startDate = manualStartDate || computedDateRange.startDate;
  const endDate = manualEndDate || computedDateRange.endDate;

  // 点击外部关闭下拉菜单
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

  // 初始化projects和当前project
  useEffect(() => {
    const loadedProjects = loadProjects();
    if (loadedProjects.length === 0) {
      // 如果没有项目，创建一个默认项目
      const defaultProject: Project = {
        id: `project-${Date.now()}`,
        name: t('project.default'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newProjects = [defaultProject];
      setProjects(newProjects);
      saveProjects(newProjects);
      setCurrentProjectIdState(defaultProject.id);
      setCurrentProjectId(defaultProject.id);
    } else {
      setProjects(loadedProjects);
      const savedCurrentProjectId = getCurrentProjectId();
      if (savedCurrentProjectId && loadedProjects.some(p => p.id === savedCurrentProjectId)) {
        setCurrentProjectIdState(savedCurrentProjectId);
      } else {
        // 如果没有保存的当前项目或项目不存在，使用第一个项目
        const firstProjectId = loadedProjects[0].id;
        setCurrentProjectIdState(firstProjectId);
        setCurrentProjectId(firstProjectId);
      }
    }
  }, [t]);

  // 当currentProjectId改变时，加载对应的tasks
  useEffect(() => {
    if (currentProjectId) {
      const loadedTasks = loadTasks(currentProjectId);
      setTasks(loadedTasks);
      // 重置自动滚动标志，以便在新项目加载时自动滚动到今天
      hasAutoScrolledRef.current = false;
    }
  }, [currentProjectId]);

  // 保存tasks到当前project
  useEffect(() => {
    if (currentProjectId) {
      saveTasks(tasks, currentProjectId);
    }
  }, [tasks, currentProjectId]);

  // 页面加载时自动滚动到今天（只在首次加载时执行）
  useEffect(() => {
    if (ganttChartRef.current && !hasAutoScrolledRef.current && startDate && endDate) {
      // 确保日期范围已经初始化，并且 GanttChart 已经渲染
      const timer = setTimeout(() => {
        if (ganttChartRef.current && !hasAutoScrolledRef.current) {
          // 再次延迟以确保滚动容器已经初始化
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
  }, [startDate, endDate]); // 依赖日期范围，确保日期计算完成后再滚动

  // 处理日期范围扩展（当滚动到边缘时调用）
  const handleDateRangeExtend = (direction: 'start' | 'end', days: number = 30) => {
    if (direction === 'start') {
      const newStartDate = subDays(startDate, days);
      setManualStartDate(newStartDate);
    } else {
      const newEndDate = addDays(endDate, days);
      setManualEndDate(newEndDate);
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleTaskSave = (task: Task) => {
    // 如果 editingTask 存在，说明是编辑模式（包括从拖拽创建的任务）
    if (editingTask) {
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === task.id ? task : t))
      );
    } else {
      // 这种情况不应该发生，因为拖拽创建的任务已经添加了
      setTasks((prevTasks) => [...prevTasks, task]);
    }
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleTaskFormCancel = () => {
    // 如果 editingTask 存在且在任务列表中，说明是从拖拽创建的，取消时需要删除它
    if (editingTask) {
      const taskExists = tasks.some(t => t.id === editingTask.id);
      if (taskExists) {
              // 检查是否是刚创建的任务（可能是从拖拽创建的）
              // 如果任务名称是"新任务"，说明是刚创建的，应该删除
              if (editingTask.name === t('task.new.default')) {
          setTasks((prevTasks) => prevTasks.filter((t) => t.id !== editingTask.id));
        }
      }
    }
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleTaskDelete = (taskId: string) => {
    // 如果已经有删除操作在进行，直接返回
    if (isDeletingRef.current) {
      return;
    }
    
    // 标记正在删除的任务ID
    isDeletingRef.current = taskId;
    
    // 使用 window.confirm 并立即删除，避免事件处理延迟导致的问题
    const shouldDelete = window.confirm(t('task.delete.confirm'));
    
    if (shouldDelete) {
      // 使用函数式更新，确保使用最新的任务列表，只删除精确匹配的任务ID
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    }
    
    // 延迟重置删除标志
    setTimeout(() => {
      isDeletingRef.current = null;
    }, 1000);
  };

  const handleNewTask = () => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskCreateFromDrag = (task: Task) => {
    // 先将任务添加到列表，这样预览框就会立即变成真正的任务条
    setTasks((prevTasks) => [...prevTasks, task]);
    // 然后打开编辑表单让用户编辑
    setEditingTask(task);
    setShowTaskForm(true);
  };

  // Project相关函数
  const handleProjectChange = (projectId: string) => {
    // 先保存当前项目的tasks
    if (currentProjectId) {
      saveTasks(tasks, currentProjectId);
    }
    // 切换到新项目
    setCurrentProjectIdState(projectId);
    setCurrentProjectId(projectId);
    setShowProjectDropdown(false);
  };

  const handleCreateProject = () => {
    const name = newProjectName.trim() || `${t('project.name')} ${projects.length + 1}`;
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    handleProjectChange(newProject.id);
    setNewProjectName('');
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length === 1) {
      alert(t('project.delete.min'));
      return;
    }
    if (window.confirm(t('project.delete.confirm'))) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      // 如果删除的是当前项目，切换到第一个项目
      if (currentProjectId === projectId) {
        handleProjectChange(updatedProjects[0].id);
      }
    }
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      // 如果名称为空，取消编辑
      setEditingProjectId(null);
      return;
    }
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, name: trimmedName, updatedAt: new Date() }
        : p
    );
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    setEditingProjectId(null);
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>{t('app.title')}</h1>
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
                  {projects.map(project => (
                    <div 
                      key={project.id} 
                      className={`project-dropdown-item ${project.id === currentProjectId ? 'active' : ''}`}
                      onClick={() => handleProjectChange(project.id)}
                    >
                      {editingProjectId === project.id ? (
                        <input
                          className="project-rename-input"
                          value={project.name}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            handleRenameProject(project.id, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameProject(project.id, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingProjectId(null);
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
                              }}
                              title={t('project.edit')}
                            >
                              {t('project.edit')}
                            </button>
                            <button
                              className="project-action-btn delete"
                              onClick={(e) => handleDeleteProject(project.id, e)}
                              title={t('project.delete')}
                            >
                              {t('project.delete')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
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
                  <button 
                    className="btn-primary btn-small"
                    onClick={handleCreateProject}
                  >
                    {t('project.new')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="header-right">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="app-main">
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
              className="btn-reset"
              onClick={() => {
                setManualStartDate(null);
                setManualEndDate(null);
              }}
              title={t('date.auto')}
            >
              {t('date.auto')}
            </button>
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
          />
        )}
      </main>

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          onSave={handleTaskSave}
          onCancel={handleTaskFormCancel}
        />
      )}
    </div>
  );
}

export default App;
