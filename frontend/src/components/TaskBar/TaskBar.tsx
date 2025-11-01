import React, { useRef, useState } from 'react';
import { Task } from '../../types';
import { getDaysBetween, getCellWidth } from '../../utils/dateUtils';
import { ViewMode } from '../../types';
import './TaskBar.css';

interface TaskBarProps {
  task: Task;
  startDate: Date;
  viewMode: ViewMode;
  onUpdate: (task: Task) => void;
  onClick?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

export const TaskBar: React.FC<TaskBarProps> = ({ task, startDate, viewMode, onUpdate, onClick, onDelete, canEdit = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [isProgressAdjusting, setIsProgressAdjusting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, date: new Date(), hasMoved: false });
  const [resizeStart, setResizeStart] = useState({ x: 0, startDate: new Date(), endDate: new Date() });
  const [, setProgressStart] = useState({ x: 0, progress: 0 });
  const isDeletingRef = useRef(false); // 防止重复删除
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cellWidth = getCellWidth(viewMode);
  const RESIZE_HANDLE_WIDTH = 8; // 调整大小的手柄宽度

  // 标准化日期以确保计算准确
  const normalizeDate = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };
  
  const normalizedStartDate = normalizeDate(startDate);
  const normalizedTaskStart = normalizeDate(task.startDate);
  const normalizedTaskEnd = normalizeDate(task.endDate);
  
  const daysFromStart = getDaysBetween(normalizedStartDate, normalizedTaskStart);
  const taskDuration = getDaysBetween(normalizedTaskStart, normalizedTaskEnd);
  const left = Math.max(0, daysFromStart * cellWidth);
  const width = Math.max(cellWidth, taskDuration * cellWidth);

  // 检测鼠标是否在调整大小的区域内
  const getResizeDirection = (e: React.MouseEvent): 'left' | 'right' | null => {
    if (!barRef.current) return null;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    if (x <= RESIZE_HANDLE_WIDTH) {
      return 'left';
    } else if (x >= rect.width - RESIZE_HANDLE_WIDTH) {
      return 'right';
    }
    return null;
  };

  // 检测鼠标是否在进度边缘（蓝白交界处）用于调整进度
  const isOnProgressEdge = (e: React.MouseEvent): boolean => {
    if (!barRef.current || !progressRef.current) return false;
    const barRect = barRef.current.getBoundingClientRect();
    const progressRect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - barRect.left;
    const progressWidth = progressRect.width;
    const threshold = 4; // 4px的容差范围，只在边缘附近
    
    // 只在进度条边缘（蓝白交界处）附近才允许调整
    return Math.abs(x - progressWidth) <= threshold && x >= 0 && x <= barRect.width;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果没有编辑权限，禁用所有交互
    if (!canEdit) {
      // 如果只是点击（不是拖拽或调整大小），允许点击查看
      if (e.button === 0 && onClick) {
        onClick();
      }
      return;
    }
    
    // 右键点击 - 只阻止默认行为，删除操作由 onContextMenu 处理
    if (e.button === 2) {
      // 不在这里处理删除，避免和 onContextMenu 重复触发
      return;
    }
    
    // 左键点击
    if (e.button === 0) {
      const resizeDir = getResizeDirection(e);
      const onProgressEdge = isOnProgressEdge(e);
      
      if (resizeDir) {
        // 开始调整大小（左右边缘）
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(resizeDir);
        setResizeStart({
          x: e.clientX,
          startDate: task.startDate,
          endDate: task.endDate,
        });
      } else if (onProgressEdge) {
        // 在进度边缘（蓝白交界处）开始调整进度
        e.preventDefault();
        e.stopPropagation();
        setIsProgressAdjusting(true);
        setProgressStart({
          x: e.clientX,
          progress: task.progress,
        });
      } else {
        // 开始拖拽或点击
        setIsDragging(true);
        setDragStart({ x: e.clientX, date: task.startDate, hasMoved: false });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging || isResizing || isProgressAdjusting) return;
    
    // 如果没有编辑权限，禁用光标样式变化
    if (!canEdit) {
      if (barRef.current) {
        barRef.current.style.cursor = 'default';
      }
      return;
    }
    
    // 更新光标样式
    const resizeDir = getResizeDirection(e);
    const onProgressEdge = isOnProgressEdge(e);
    
    if (resizeDir === 'left' || resizeDir === 'right') {
      if (barRef.current) {
        barRef.current.style.cursor = 'ew-resize';
      }
    } else if (onProgressEdge) {
      // 在进度边缘时显示调整大小的光标
      if (barRef.current) {
        barRef.current.style.cursor = 'ew-resize';
      }
    } else {
      if (barRef.current) {
        barRef.current.style.cursor = 'pointer';
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging && !isResizing && !isProgressAdjusting) return;
    
    if (isDragging) {
      // 如果鼠标没有移动，认为是点击事件
      if (!dragStart.hasMoved && onClick) {
        onClick();
      }
      
      setIsDragging(false);
      setDragStart({ x: 0, date: new Date(), hasMoved: false });
    }
    
    if (isResizing) {
      setIsResizing(null);
      setResizeStart({ x: 0, startDate: new Date(), endDate: new Date() });
    }
    
    if (isProgressAdjusting) {
      setIsProgressAdjusting(false);
      setProgressStart({ x: 0, progress: 0 });
    }
  };

  // 处理调整大小的逻辑
  React.useEffect(() => {
    if (isResizing) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStart.x;
        const deltaDays = Math.round(deltaX / cellWidth);
        
        if (isResizing === 'left') {
          // 调整左侧（开始日期）
          const newStartDate = new Date(resizeStart.startDate);
          newStartDate.setDate(newStartDate.getDate() + deltaDays);
          const normalizedNewStart = normalizeDate(newStartDate);
          const normalizedEnd = normalizeDate(resizeStart.endDate);
          const normalizedStart = normalizeDate(startDate);
          
          // 确保新的开始日期不晚于结束日期，且不早于甘特图起始日期
          if (normalizedNewStart < normalizedEnd && normalizedNewStart >= normalizedStart) {
            onUpdate({
              ...task,
              startDate: normalizedNewStart,
            });
          }
        } else if (isResizing === 'right') {
          // 调整右侧（结束日期）
          const newEndDate = new Date(resizeStart.endDate);
          newEndDate.setDate(newEndDate.getDate() + deltaDays);
          const normalizedNewEnd = normalizeDate(newEndDate);
          const normalizedStart = normalizeDate(resizeStart.startDate);
          
          // 确保新的结束日期不早于开始日期
          if (normalizedNewEnd > normalizedStart) {
            onUpdate({
              ...task,
              endDate: normalizedNewEnd,
            });
          }
        }
      };

      const handleGlobalMouseUp = () => {
        setIsResizing(null);
        setResizeStart({ x: 0, startDate: new Date(), endDate: new Date() });
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isResizing, resizeStart, cellWidth, startDate, task, onUpdate]);

  // 处理拖拽的逻辑
  React.useEffect(() => {
    if (isDragging) {
      let hasMoved = false;
      const initialX = dragStart.x;
      const initialDate = dragStart.date;
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = Math.abs(e.clientX - initialX);
        
        // 如果移动超过5px，认为是拖拽
        if (deltaX > 5) {
          hasMoved = true;
        }
        
        const deltaDays = Math.round((e.clientX - initialX) / cellWidth);
        const newStartDate = new Date(initialDate);
        newStartDate.setDate(newStartDate.getDate() + deltaDays);
        
        if (newStartDate >= startDate) {
          const newEndDate = new Date(newStartDate);
          newEndDate.setDate(newEndDate.getDate() + taskDuration);
          
          onUpdate({
            ...task,
            startDate: newStartDate,
            endDate: newEndDate,
          });
        }
      };

      const handleGlobalMouseUp = () => {
        if (!hasMoved && onClick) {
          onClick();
        }
        setIsDragging(false);
        setDragStart({ x: 0, date: new Date(), hasMoved: false });
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart.x, dragStart.date, cellWidth, taskDuration, startDate, task, onUpdate, onClick]);

  // 处理进度调整的逻辑
  React.useEffect(() => {
    if (isProgressAdjusting && barRef.current) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const barRect = barRef.current!.getBoundingClientRect();
        const x = e.clientX - barRect.left;
        const newProgress = Math.max(0, Math.min(100, (x / barRect.width) * 100));
        
        onUpdate({
          ...task,
          progress: Math.round(newProgress),
        });
      };

      const handleGlobalMouseUp = () => {
        setIsProgressAdjusting(false);
        setProgressStart({ x: 0, progress: 0 });
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isProgressAdjusting, task, onUpdate]);

  const progressWidth = (width * task.progress) / 100;

  return (
    <div
      ref={barRef}
      className={`task-bar ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isProgressAdjusting ? 'progress-adjusting' : ''}`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        if (!canEdit) {
          e.preventDefault();
          return;
        }
        
        if (onDelete && !isDeletingRef.current) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡，防止影响其他任务
          e.nativeEvent.stopImmediatePropagation(); // 立即停止所有事件传播
          
          // 立即设置标志，防止重复触发
          isDeletingRef.current = true;
          
          // 在下一个事件循环中执行删除，确保所有事件都已处理
          setTimeout(() => {
            if (onDelete) {
              onDelete();
            }
            // 延迟重置标志
            setTimeout(() => {
              isDeletingRef.current = false;
            }, 500);
          }, 0);
        }
      }}
      title={task.name}
    >
      {/* 左侧调整大小手柄 */}
      <div
        className="task-bar-resize-handle task-bar-resize-handle-left"
        style={{ width: `${RESIZE_HANDLE_WIDTH}px` }}
      />
      
      <div
        ref={progressRef}
        className="task-bar-progress"
        style={{ 
          width: `${progressWidth}px`,
          backgroundColor: task.color || '#4a90e2',
        }}
      />
      <div 
        className={`task-bar-label ${task.progress > 25 ? 'task-bar-label-white-text' : 'task-bar-label-dark-text'}`}
      >
        {task.name}
      </div>
      
      {/* 右侧调整大小手柄 */}
      <div
        className="task-bar-resize-handle task-bar-resize-handle-right"
        style={{ right: 0, width: `${RESIZE_HANDLE_WIDTH}px` }}
      />
    </div>
  );
};
