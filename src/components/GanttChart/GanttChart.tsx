import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Task, ViewMode, ProjectMember } from '../../types';
import { Timeline } from '../Timeline/Timeline';
import { TaskBar } from '../TaskBar/TaskBar';
import { useI18n } from '../../contexts/I18nContext';
import { getCellWidth, getDaysBetween } from '../../utils/dateUtils';
import './GanttChart.css';

interface GanttChartProps {
  tasks: Task[];
  startDate: Date;
  endDate: Date;
  viewMode: ViewMode;
  onTaskUpdate: (task: Task) => void;
  onDateRangeExtend?: (direction: 'start' | 'end', days: number) => void;
  onTaskClick?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onNewTask?: () => void;
  onTaskCreateFromDrag?: (task: Task) => void;
  canEdit?: boolean;
  projectMembers?: ProjectMember[];
}

export interface GanttChartRef {
  scrollToDate: (date: Date) => void;
}

export const GanttChart = forwardRef<GanttChartRef, GanttChartProps>(({
  tasks,
  startDate,
  endDate,
  viewMode,
  onTaskUpdate,
  onDateRangeExtend,
  onTaskClick,
  onTaskDelete,
  onNewTask,
  onTaskCreateFromDrag,
  canEdit = true,
  projectMembers = [],
}, ref) => {
  const { t } = useI18n();
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number; date: Date; scrollLeft: number; rowIndex: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ x: number; rowIndex: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isHoveringLastRow, setIsHoveringLastRow] = useState(false);
  const [lastRowHoveredDate, setLastRowHoveredDate] = useState<Date | null>(null);
  const [lastRowHoveredDaysFromStart, setLastRowHoveredDaysFromStart] = useState<number | null>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const lastExtendTimeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const cellWidth = getCellWidth(viewMode);
  const days = getDaysBetween(startDate, endDate);
  const totalWidth = days * cellWidth;

  // 暴露滚动到今天的方法
  useImperativeHandle(ref, () => ({
    scrollToDate: (date: Date) => {
      const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const normalizedDate = normalizeDate(date);
      const normalizedStartDate = normalizeDate(startDate);
      const normalizedEndDate = normalizeDate(endDate);
      
      // 如果今天不在范围内，先扩展日期范围
      if (normalizedDate < normalizedStartDate) {
        const daysBeforeStart = getDaysBetween(normalizedDate, normalizedStartDate);
        onDateRangeExtend?.('start', daysBeforeStart + 30);
        // 使用 requestAnimationFrame 等待DOM更新后滚动
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToDatePosition(normalizedDate);
          }, 200);
        });
      } else if (normalizedDate > normalizedEndDate) {
        const daysAfterEnd = getDaysBetween(normalizedEndDate, normalizedDate);
        onDateRangeExtend?.('end', daysAfterEnd + 30);
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToDatePosition(normalizedDate);
          }, 200);
        });
      } else {
        scrollToDatePosition(normalizedDate);
      }
    },
  }));

  const scrollToDatePosition = (targetDate: Date) => {
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const normalizedStartDate = normalizeDate(startDate);
    const normalizedTargetDate = normalizeDate(targetDate);
    
    const daysFromStart = getDaysBetween(normalizedStartDate, normalizedTargetDate);
    const targetScrollLeft = daysFromStart * cellWidth;
    
    // 滚动到目标位置，稍微向左偏移以便更好地看到今天的列
    const scrollPosition = Math.max(0, targetScrollLeft - 100);
    
    // 使用 requestAnimationFrame 确保 DOM 已经渲染
    requestAnimationFrame(() => {
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollPosition;
      }
      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollLeft = scrollPosition;
      }
      setScrollLeft(scrollPosition);
    });
  };

  // 处理绘制模式的逻辑
  useEffect(() => {
    if (isDrawingMode && drawingStart && onTaskCreateFromDrag) {
      // 如果 drawingCurrent 还没有设置，立即设置一个初始值
      if (!drawingCurrent && timelineContentRef.current && bodyScrollRef.current) {
        // 使用 drawingStart 的位置，但稍微偏移一点，确保预览条可见
        // drawingStart.x 已经是相对于内容区域的坐标
        setDrawingCurrent({ x: drawingStart.x + cellWidth, rowIndex: drawingStart.rowIndex });
      }
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!timelineContentRef.current || !bodyScrollRef.current) return;
        
        const scrollLeft = bodyScrollRef.current.scrollLeft;
        // 使用与悬停高亮相同的坐标计算方式
        const containerRect = bodyScrollRef.current.getBoundingClientRect();
        // x 是相对于内容区域的总坐标
        const x = e.clientX - containerRect.left + scrollLeft;
        const rect = timelineContentRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        // 计算在哪一行
        const rowIndex = Math.floor(y / 40);
        const targetRowIndex = Math.max(0, Math.min(rowIndex, tasks.length));
        
        // 限制在有效范围内，存储相对于内容区域的坐标（不减去 scrollLeft）
        const clampedX = Math.max(0, Math.min(x, totalWidth));
        setDrawingCurrent({ x: clampedX, rowIndex: targetRowIndex });
        
        // 更新悬停日期，以便高亮当前日期列
        const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const normalizedStartDate = normalizeDate(startDate);
        const daysFromStart = Math.floor(clampedX / cellWidth);
        const hoveredDay = new Date(normalizedStartDate);
        hoveredDay.setDate(hoveredDay.getDate() + daysFromStart);
        if (hoveredDay >= normalizedStartDate) {
          setHoveredDate(hoveredDay);
        }
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        if (!timelineContentRef.current || !drawingStart || !bodyScrollRef.current) return;
        
        const currentScrollLeft = bodyScrollRef.current.scrollLeft;
        // 使用与悬停高亮相同的坐标计算方式
        const containerRect = bodyScrollRef.current.getBoundingClientRect();
        const endX = e.clientX - containerRect.left + currentScrollLeft;
        
        const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const normalizedStartDate = normalizeDate(startDate);
        
        // 计算开始和结束日期（drawingStart.x 已经是相对于内容区域的坐标）
        const startX = drawingStart.x;
        const finalEndX = Math.max(0, Math.min(endX, totalWidth));
        
        const startDaysFromStart = Math.floor(Math.min(startX, finalEndX) / cellWidth);
        const endDaysFromStart = Math.floor(Math.max(startX, finalEndX) / cellWidth);
        
        const taskStartDate = new Date(normalizedStartDate);
        taskStartDate.setDate(taskStartDate.getDate() + startDaysFromStart);
        
        const taskEndDate = new Date(normalizedStartDate);
        taskEndDate.setDate(taskEndDate.getDate() + endDaysFromStart);
        
        // 计算拖拽的最小距离（至少一个单元格宽度）
        const minDragDistance = cellWidth;
        const dragDistance = Math.abs(finalEndX - startX);
        
        // 确保有有效的日期范围（至少1天）且日期有效，并且拖拽距离足够
        if (taskStartDate >= normalizedStartDate && taskEndDate > taskStartDate && dragDistance >= minDragDistance) {
          // 创建新任务
          const newTask: Task = {
            id: `task-${Date.now()}`,
            name: t('task.new.default'),
            startDate: taskStartDate,
            endDate: taskEndDate,
            progress: 5,
            color: '#4a90e2',
          };
          
          onTaskCreateFromDrag(newTask);
        }
        
        // 重置状态
        setIsDrawingMode(false);
        setDrawingStart(null);
        setDrawingCurrent(null);
        setHoveredDate(null); // 清空悬停日期
      };

      // 立即注册监听器，确保能捕获鼠标移动
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDrawingMode, drawingStart, drawingCurrent, startDate, cellWidth, tasks.length, totalWidth, onTaskCreateFromDrag, t, canEdit]);
  
  // 清理长按定时器
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeftValue = e.currentTarget.scrollLeft;
    const scrollWidth = e.currentTarget.scrollWidth;
    const clientWidth = e.currentTarget.clientWidth;
    setScrollLeft(scrollLeftValue);
    
    // 同步头部和主体的滚动
    if (e.currentTarget === headerScrollRef.current) {
      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollLeft = scrollLeftValue;
      }
    } else if (e.currentTarget === bodyScrollRef.current) {
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollLeftValue;
      }
    }

    // 检测是否滚动到边缘，自动扩展日期范围
    if (onDateRangeExtend) {
      const now = Date.now();
      const threshold = 200; // 距离边缘200px时触发扩展
      const extendCooldown = 1000; // 1秒内只能扩展一次

      // 检查是否滚动到开始位置附近
      if (scrollLeftValue < threshold && 
          now - lastExtendTimeRef.current.start > extendCooldown) {
        onDateRangeExtend('start', 90);
        lastExtendTimeRef.current.start = now;
      }
      
      // 检查是否滚动到结束位置附近
      if (scrollLeftValue + clientWidth > scrollWidth - threshold &&
          now - lastExtendTimeRef.current.end > extendCooldown) {
        onDateRangeExtend('end', 90);
        lastExtendTimeRef.current.end = now;
      }
    }
  };

  return (
    <div className="gantt-chart-container">
      <div className="gantt-chart-header">
        <div className="gantt-task-list-header">
          <div className="gantt-task-header-cell">{t('task.name.header')}</div>
        </div>
        <div className="gantt-timeline-header-wrapper" ref={headerScrollRef} onScroll={handleScroll}>
          <div style={{ width: `${totalWidth}px` }}>
            <Timeline
              startDate={startDate}
              endDate={endDate}
              viewMode={viewMode}
              scrollLeft={scrollLeft}
              onHoveredDate={setHoveredDate}
              hoveredDate={hoveredDate}
            />
          </div>
        </div>
      </div>
      <div className="gantt-chart-body">
        <div className="gantt-task-list">
          {tasks.map((task) => (
            <div key={task.id} className="gantt-task-row">
              <div className="gantt-task-cell">
                <div className="task-info">
                  <div className="task-name">{task.name}</div>
                  {task.assignee && (
                    <div className="task-assignee">{t('task.assignee.label')} {task.assignee}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="gantt-add-task-row">
            {canEdit && (
              <button className="gantt-add-task-button" onClick={onNewTask} title={t('button.add.task')}>
                <span className="gantt-add-task-icon">+</span>
              </button>
            )}
          </div>
        </div>
        <div
          className="gantt-timeline-body"
          ref={bodyScrollRef}
          onScroll={handleScroll}
        >
          <div
            ref={timelineContentRef}
            className={`gantt-timeline-content ${isDrawingMode ? 'drawing-mode' : ''} ${isHoveringLastRow ? 'hovering-last-row' : ''}`}
            style={{ width: `${totalWidth}px`, position: 'relative', height: `${Math.max(40, (tasks.length + 1) * 40)}px`, cursor: (isDrawingMode || isHoveringLastRow) ? 'crosshair' : 'default' }}
            onMouseMove={(e) => {
              // 如果没有编辑权限，禁用悬停效果
              if (!canEdit) {
                return;
              }
              
              // 检测鼠标是否在最后一行
              const rect = timelineContentRef.current?.getBoundingClientRect();
              if (!rect || !bodyScrollRef.current) return;
              
              const y = e.clientY - rect.top;
              const rowIndex = Math.floor(y / 40);
              const lastRowIndex = tasks.length;
              
              // 如果鼠标在最后一行（添加任务行），设置悬停状态
              const isLastRow = rowIndex >= lastRowIndex;
              setIsHoveringLastRow(isLastRow);
              
              // 如果在最后一行，计算对应的日期并高亮
              if (isLastRow) {
                const scrollLeft = bodyScrollRef.current.scrollLeft;
                // 使用更准确的坐标计算：相对于滚动容器的位置
                const containerRect = bodyScrollRef.current.getBoundingClientRect();
                const xRelativeToContainer = e.clientX - containerRect.left + scrollLeft;
                
                const daysFromStart = Math.floor(xRelativeToContainer / cellWidth);
                
                // 确保在有效范围内
                if (xRelativeToContainer >= 0 && xRelativeToContainer <= totalWidth && daysFromStart >= 0 && daysFromStart < days) {
                  setLastRowHoveredDaysFromStart(daysFromStart);
                  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  const normalizedStartDate = normalizeDate(startDate);
                  const hoveredDay = new Date(normalizedStartDate);
                  hoveredDay.setDate(hoveredDay.getDate() + daysFromStart);
                  setLastRowHoveredDate(hoveredDay);
                } else {
                  setLastRowHoveredDate(null);
                  setLastRowHoveredDaysFromStart(null);
                }
              } else {
                // 如果不在最后一行，清空状态
                setLastRowHoveredDate(null);
                setLastRowHoveredDaysFromStart(null);
              }
            }}
            onMouseLeave={() => {
              setIsHoveringLastRow(false);
              setLastRowHoveredDate(null);
              setLastRowHoveredDaysFromStart(null);
              // 如果不在绘制模式，清空悬停日期
              if (!isDrawingMode) {
                setHoveredDate(null);
              }
            }}
            onMouseDown={(e) => {
              // 如果没有编辑权限，禁用绘制模式
              if (!canEdit) {
                return;
              }
              
              // 只在任务区域（不是已有任务条）且是左键点击时开始长按检测
              // 注意：在最后一行时，允许点击按钮区域，但需要排除按钮本身的点击事件
              const isButtonClick = (e.target as HTMLElement).closest('button') && 
                                     (e.target as HTMLElement).closest('button')?.className.includes('gantt-add-task-button');
              
              if (e.button === 0 && !(e.target as HTMLElement).closest('.task-bar') && !isButtonClick) {
                const rect = timelineContentRef.current?.getBoundingClientRect();
                if (!rect || !bodyScrollRef.current) return;
                
                const scrollLeft = bodyScrollRef.current.scrollLeft;
                // 使用与悬停高亮相同的坐标计算方式
                const containerRect = bodyScrollRef.current.getBoundingClientRect();
                const xRelativeToContainer = e.clientX - containerRect.left + scrollLeft;
                const y = e.clientY - rect.top;
                
                // 计算在哪一行（向下取整，找到对应的任务行，如果没有任务则在最后一行）
                const rowIndex = Math.floor(y / 40);
                const targetRowIndex = Math.min(rowIndex, tasks.length);
                const isLastRow = rowIndex >= tasks.length; // 判断是否在最后一行
                
                const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const normalizedStartDate = normalizeDate(startDate);
                
                const daysFromStart = Math.floor(xRelativeToContainer / cellWidth);
                const clickedDate = new Date(normalizedStartDate);
                clickedDate.setDate(clickedDate.getDate() + daysFromStart);
                
                if (clickedDate >= normalizedStartDate && xRelativeToContainer >= 0 && xRelativeToContainer <= totalWidth) {
                  const initialX = e.clientX;
                  const initialY = e.clientY;
                  const pressStartTime = Date.now();
                  
                  // 在最后一行时，如果已经有悬停状态，可以直接进入绘制模式
                  // 否则，需要等待长按检测
                  const shouldStartImmediately = isLastRow && isHoveringLastRow;
                  
                  let timer: ReturnType<typeof setTimeout> | null = null;
                  let hasEnteredDrawingMode = false; // 本地变量跟踪是否已进入绘制模式
                  
                  if (shouldStartImmediately) {
                    // 在最后一行时，直接进入绘制模式
                    hasEnteredDrawingMode = true;
                    setIsDrawingMode(true);
                    // 存储相对于内容区域的坐标（不减去 scrollLeft）
                    setDrawingStart({ x: xRelativeToContainer, date: clickedDate, scrollLeft, rowIndex: targetRowIndex });
                    // 设置一个稍微不同的初始值，确保预览条能立即显示
                    setDrawingCurrent({ x: xRelativeToContainer + cellWidth, rowIndex: targetRowIndex });
                  } else {
                    // 开始长按检测（300ms后进入绘制模式）
                    timer = setTimeout(() => {
                      hasEnteredDrawingMode = true;
                      setIsDrawingMode(true);
                      // 存储相对于内容区域的坐标（不减去 scrollLeft）
                      setDrawingStart({ x: xRelativeToContainer, date: clickedDate, scrollLeft, rowIndex: targetRowIndex });
                      // 设置一个稍微不同的初始值，确保预览条能立即显示
                      setDrawingCurrent({ x: xRelativeToContainer + cellWidth, rowIndex: targetRowIndex });
                    }, 300);
                    
                    setLongPressTimer(timer);
                  }
                  
                  // 监听鼠标移动
                  const handleMove = (moveEvent: MouseEvent) => {
                    const timeElapsed = Date.now() - pressStartTime;
                    const deltaX = Math.abs(moveEvent.clientX - initialX);
                    const deltaY = Math.abs(moveEvent.clientY - initialY);
                    
                    // 如果移动超过阈值
                    if (deltaX > 5 || deltaY > 5) {
                      // 在最后一行时，如果已经过了短暂时间（100ms）或已经进入绘制模式，允许继续
                      if (isLastRow && (timeElapsed >= 100 || shouldStartImmediately || hasEnteredDrawingMode)) {
                        if (timer) {
                          clearTimeout(timer);
                          setLongPressTimer(null);
                        }
                        // 如果还没有进入绘制模式，现在进入
                        if (!hasEnteredDrawingMode) {
                          hasEnteredDrawingMode = true;
                          // 重新计算位置（使用移动后的位置）
                          if (timelineContentRef.current && bodyScrollRef.current) {
                            const newScrollLeft = bodyScrollRef.current.scrollLeft;
                            const newContainerRect = bodyScrollRef.current.getBoundingClientRect();
                            const newX = moveEvent.clientX - newContainerRect.left + newScrollLeft;
                            const newY = moveEvent.clientY - timelineContentRef.current.getBoundingClientRect().top;
                            const newRowIndex = Math.floor(newY / 40);
                            const newTargetRowIndex = Math.min(newRowIndex, tasks.length);
                            const newDaysFromStart = Math.floor(newX / cellWidth);
                            const newClickedDate = new Date(normalizedStartDate);
                            newClickedDate.setDate(newClickedDate.getDate() + newDaysFromStart);
                            const clampedX = Math.max(0, Math.min(newX, totalWidth));
                            setIsDrawingMode(true);
                            // 存储相对于内容区域的坐标（不减去 scrollLeft）
                            setDrawingStart({ x: clampedX, date: newClickedDate, scrollLeft: newScrollLeft, rowIndex: newTargetRowIndex });
                            // 设置当前鼠标位置作为 drawingCurrent，确保预览条立即显示
                            setDrawingCurrent({ x: clampedX, rowIndex: newTargetRowIndex });
                          }
                        }
                        // 移除本地监听器，让全局的绘制模式处理逻辑接管（它会实时更新 drawingCurrent）
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                      } else if (timeElapsed >= 300) {
                        // 如果已经过了长按时间（300ms），直接进入绘制模式
                        if (timer) {
                          clearTimeout(timer);
                          setLongPressTimer(null);
                        }
                        if (!hasEnteredDrawingMode) {
                          hasEnteredDrawingMode = true;
                          // 重新计算位置（使用移动后的位置）
                          if (timelineContentRef.current && bodyScrollRef.current) {
                            const newScrollLeft = bodyScrollRef.current.scrollLeft;
                            const newContainerRect = bodyScrollRef.current.getBoundingClientRect();
                            const newX = moveEvent.clientX - newContainerRect.left + newScrollLeft;
                            const newY = moveEvent.clientY - timelineContentRef.current.getBoundingClientRect().top;
                            const newRowIndex = Math.floor(newY / 40);
                            const newTargetRowIndex = Math.min(newRowIndex, tasks.length);
                            const newDaysFromStart = Math.floor(newX / cellWidth);
                            const newClickedDate = new Date(normalizedStartDate);
                            newClickedDate.setDate(newClickedDate.getDate() + newDaysFromStart);
                            const clampedX = Math.max(0, Math.min(newX, totalWidth));
                            setIsDrawingMode(true);
                            // 存储相对于内容区域的坐标（不减去 scrollLeft）
                            setDrawingStart({ x: clampedX, date: newClickedDate, scrollLeft: newScrollLeft, rowIndex: newTargetRowIndex });
                            // 设置当前鼠标位置作为 drawingCurrent，确保预览条立即显示
                            setDrawingCurrent({ x: clampedX, rowIndex: newTargetRowIndex });
                          } else {
                            setIsDrawingMode(true);
                            // 存储相对于内容区域的坐标（不减去 scrollLeft）
                            setDrawingStart({ x: xRelativeToContainer, date: clickedDate, scrollLeft, rowIndex: targetRowIndex });
                            // 设置一个稍微不同的初始值，确保预览条能立即显示
                            setDrawingCurrent({ x: xRelativeToContainer + cellWidth, rowIndex: targetRowIndex });
                          }
                        }
                        // 移除本地监听器，让全局的绘制模式处理逻辑接管（它会实时更新 drawingCurrent）
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                      } else {
                        // 在长按时间之前移动，取消长按（但最后一行除外）
                        if (!isLastRow && timer) {
                          clearTimeout(timer);
                          setLongPressTimer(null);
                        }
                        // 如果在最后一行，不移除监听器，允许继续拖拽
                        if (!isLastRow) {
                          document.removeEventListener('mousemove', handleMove);
                          document.removeEventListener('mouseup', handleUp);
                        }
                      }
                    }
                  };
                  
                  const handleUp = () => {
                    if (timer) {
                      clearTimeout(timer);
                      setLongPressTimer(null);
                    }
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleUp);
                  };
                  
                  document.addEventListener('mousemove', handleMove);
                  document.addEventListener('mouseup', handleUp);
                }
              }
            }}
          >
            <div className="gantt-grid-lines">
              {Array.from({ length: days + 1 }).map((_, index) => {
                const dayDate = new Date(startDate);
                dayDate.setDate(dayDate.getDate() + index);
                const dayOfWeek = dayDate.getDay();
                const isWeekendColumn = dayOfWeek === 0 || dayOfWeek === 6; // 0 = 周日, 6 = 周六
                // 只在头部悬停时（不是最后一行悬停）才应用整列高亮
                const isHovered = hoveredDate && !lastRowHoveredDate && (
                  dayDate.getFullYear() === hoveredDate.getFullYear() &&
                  dayDate.getMonth() === hoveredDate.getMonth() &&
                  dayDate.getDate() === hoveredDate.getDate()
                );
                
                return (
                  <div
                    key={index}
                    className={`grid-line ${isWeekendColumn ? 'grid-line-weekend' : ''} ${isHovered ? 'grid-line-hovered' : ''}`}
                    style={{
                      left: `${index * cellWidth}px`,
                      width: `${cellWidth}px`,
                    }}
                  />
                );
              })}
            </div>
            {/* 今天的红色指示线 - 根据当前时间精确定位 */}
            {(() => {
              const today = new Date();
              const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
              const normalizedToday = normalizeDate(today);
              const normalizedStartDate = normalizeDate(startDate);
              const normalizedEndDate = normalizeDate(endDate);
              
              // 检查今天是否在可见范围内
              if (normalizedToday >= normalizedStartDate && normalizedToday <= normalizedEndDate) {
                const daysFromStart = getDaysBetween(normalizedStartDate, normalizedToday);
                const todayColumnLeft = daysFromStart * cellWidth;
                
                // 计算当前时间在一天中的比例（0-1）
                const hours = today.getHours();
                const minutes = today.getMinutes();
                const timeRatio = (hours * 60 + minutes) / (24 * 60); // 一天有1440分钟
                
                // 计算红线在当天列中的位置
                const timeOffset = timeRatio * cellWidth;
                const linePosition = todayColumnLeft + timeOffset;
                
                return (
                  <div
                    className="today-time-indicator"
                    style={{
                      left: `${linePosition}px`,
                    }}
                  />
                );
              }
              return null;
            })()}
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="gantt-task-row-timeline"
                style={{
                  top: `${index * 40}px`,
                  height: '40px',
                  position: 'absolute',
                  width: `${totalWidth}px`,
                }}
              >
                <TaskBar
                  key={task.id}
                  task={task}
                  startDate={startDate}
                  viewMode={viewMode}
                  onUpdate={onTaskUpdate}
                  onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                  onDelete={onTaskDelete ? (() => {
                    const taskIdToDelete = task.id; // 立即捕获task.id，避免闭包问题
                    return () => {
                      onTaskDelete(taskIdToDelete);
                    };
                  })() : undefined}
                  canEdit={canEdit}
                  projectMembers={projectMembers}
                />
              </div>
            ))}
            {/* 绘制模式的预览条 */}
            {isDrawingMode && drawingStart && (
              drawingCurrent ? (
                <div
                  className="gantt-drawing-preview"
                  style={{
                    top: `${drawingStart.rowIndex * 40}px`,
                    left: `${Math.max(0, Math.min(drawingStart.x, drawingCurrent.x))}px`,
                    width: `${Math.max(cellWidth, Math.abs(drawingCurrent.x - drawingStart.x))}px`,
                    zIndex: 100,
                  }}
                />
              ) : (
                // 如果 drawingCurrent 还没有设置，显示一个初始预览条
                <div
                  className="gantt-drawing-preview"
                  style={{
                    top: `${drawingStart.rowIndex * 40}px`,
                    left: `${Math.max(0, drawingStart.x)}px`,
                    width: `${cellWidth}px`,
                    zIndex: 100,
                  }}
                />
              )
            )}
            {/* 最后一行单元格悬停高亮 */}
            {isHoveringLastRow && lastRowHoveredDaysFromStart !== null && (
              <div
                className="last-row-cell-hover"
                style={{
                  top: `${tasks.length * 40}px`,
                  left: `${lastRowHoveredDaysFromStart * cellWidth}px`,
                  width: `${cellWidth}px`,
                  height: '40px',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
