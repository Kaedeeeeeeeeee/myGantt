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
  const [isDragPending, setIsDragPending] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [isProgressAdjusting, setIsProgressAdjusting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, date: new Date(), hasMoved: false });
  const [resizeStart, setResizeStart] = useState({ x: 0, startDate: new Date(), endDate: new Date() });
  const [, setProgressStart] = useState({ x: 0, progress: 0 });
  // 添加本地状态来存储实时的拖动/调整值，用于立即显示UI效果
  const [localTask, setLocalTask] = useState<Task | null>(null);
  const isDeletingRef = useRef(false); // 防止重复删除
  // 使用ref来跟踪拖拽状态，确保在事件处理器之间正确共享
  const dragStateRef = useRef({ hasMoved: false, hasUpdated: false, hasCalledUpdate: false });
  const dragPhaseRef = useRef<'idle' | 'pending' | 'dragging'>('idle');
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cellWidth = getCellWidth(viewMode);
  const RESIZE_HANDLE_WIDTH = 8; // 调整大小的手柄宽度
  const DRAG_DISTANCE_THRESHOLD = 5; // 判定拖拽的最小像素距离

  // 标准化日期以确保计算准确
  const normalizeDate = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };
  
  // 当task prop更新时，清除本地状态（表示API响应已返回）
  React.useEffect(() => {
    if (!isDragging && !isResizing && !isProgressAdjusting) {
      // 只有当本地状态存在且与prop不同时才清除
      // 这样可以避免在拖动过程中因为其他原因导致的prop更新而清除本地状态
      if (localTask) {
        const normalizedLocalStart = normalizeDate(localTask.startDate);
        const normalizedPropStart = normalizeDate(task.startDate);
        const normalizedLocalEnd = normalizeDate(localTask.endDate);
        const normalizedPropEnd = normalizeDate(task.endDate);
        
        // 如果prop的数据与本地状态相同（在容差范围内），清除本地状态
        const datesMatch = 
          normalizedLocalStart.getTime() === normalizedPropStart.getTime() &&
          normalizedLocalEnd.getTime() === normalizedPropEnd.getTime() &&
          localTask.progress === task.progress;
        
        if (datesMatch) {
          setLocalTask(null);
        }
      }
    }
  }, [task.id, task.startDate, task.endDate, task.progress, isDragging, isResizing, isProgressAdjusting, localTask]);
  
  // 使用本地状态或原始task来计算显示位置
  const displayTask = localTask || task;
  const normalizedStartDate = normalizeDate(startDate);
  const normalizedTaskStart = normalizeDate(displayTask.startDate);
  const normalizedTaskEnd = normalizeDate(displayTask.endDate);
  
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
        setIsDragging(false);
        setIsDragPending(false);
        dragPhaseRef.current = 'idle';
        setProgressStart({
          x: e.clientX,
          progress: task.progress,
        });
      } else {
        // 开始拖拽或点击
        dragStateRef.current = { hasMoved: false, hasUpdated: false, hasCalledUpdate: false };
        setIsDragPending(true);
        setIsDragging(false);
        dragPhaseRef.current = 'pending';
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

  const handleMouseUp = (e: React.MouseEvent) => {
    // 如果正在进行拖拽、调整大小或进度调整，不在本地处理mouseup事件
    // 这些操作都使用全局事件处理器来处理，避免冲突
    if (isDragging || isResizing || isProgressAdjusting) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // 如果没有任何操作在进行，这个函数实际上不应该被调用
    // 因为点击操作应该在handleGlobalMouseUp中处理
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
            const updatedTask = {
              ...task,
              startDate: normalizedNewStart,
            };
            // 立即更新本地状态以显示实时效果
            setLocalTask(updatedTask);
            onUpdate(updatedTask);
          }
        } else if (isResizing === 'right') {
          // 调整右侧（结束日期）
          const newEndDate = new Date(resizeStart.endDate);
          newEndDate.setDate(newEndDate.getDate() + deltaDays);
          const normalizedNewEnd = normalizeDate(newEndDate);
          const normalizedStart = normalizeDate(resizeStart.startDate);
          
          // 确保新的结束日期不早于开始日期
          if (normalizedNewEnd > normalizedStart) {
            const updatedTask = {
              ...task,
              endDate: normalizedNewEnd,
            };
            // 立即更新本地状态以显示实时效果
            setLocalTask(updatedTask);
            onUpdate(updatedTask);
          }
        }
      };

      const handleGlobalMouseUp = () => {
        setIsResizing(null);
        setResizeStart({ x: 0, startDate: new Date(), endDate: new Date() });
        // 不立即清除本地状态，等待API响应后再清除
        // 这样可以避免在API响应返回前UI闪烁
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isResizing, resizeStart, cellWidth, startDate, task, onUpdate]);

  // 处理拖拽的逻辑（包含待确认与正式拖拽两个阶段）
  React.useEffect(() => {
    if (isDragPending || isDragging) {
      const initialX = dragStart.x;
      const initialDate = dragStart.date;
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaXRaw = e.clientX - initialX;
        const deltaX = Math.abs(deltaXRaw);
        let currentPhase = dragPhaseRef.current;
        
        if (currentPhase === 'pending') {
          if (deltaX >= DRAG_DISTANCE_THRESHOLD) {
            dragStateRef.current.hasMoved = true;
            setIsDragPending(false);
            setIsDragging(true);
            dragPhaseRef.current = 'dragging';
            currentPhase = 'dragging';
          } else {
            return;
          }
        }
        
        if (currentPhase !== 'dragging') {
          return;
        }

        const deltaDays = Math.round(deltaXRaw / cellWidth);
        if (deltaDays === 0) {
          return;
        }

        const newStartDate = new Date(initialDate);
        newStartDate.setDate(newStartDate.getDate() + deltaDays);
        const normalizedNewStart = normalizeDate(newStartDate);
        const normalizedStartBoundary = normalizeDate(startDate);
        if (normalizedNewStart < normalizedStartBoundary) {
          return;
        }
        
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + taskDuration);
        const normalizedNewEnd = normalizeDate(newEndDate);
        if (normalizedNewEnd <= normalizedNewStart) {
          return;
        }
        
        dragStateRef.current.hasUpdated = true;
        
        const updatedTask = {
          ...task,
          startDate: newStartDate,
          endDate: newEndDate,
        };
        // 立即更新本地状态以显示实时效果
        setLocalTask(updatedTask);
        // 标记已调用onUpdate，说明用户进行了拖拽操作
        dragStateRef.current.hasCalledUpdate = true;
        onUpdate(updatedTask);
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        const phaseAtEnd = dragPhaseRef.current;
        if (phaseAtEnd === 'dragging') {
          // 阻止事件冒泡，防止触发其他点击事件
          e.preventDefault();
          e.stopPropagation();
        }
        
        // 立即移除事件监听器，防止继续响应鼠标移动
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        
        // 只有在没有移动、没有更新任务、且没有调用onUpdate的情况下，才认为是点击
        // 如果hasMoved、hasUpdated或hasCalledUpdate为true，说明用户进行了拖拽操作，不应该打开详情面板
        const { hasMoved, hasUpdated, hasCalledUpdate } = dragStateRef.current;
        
        // 如果调用了onUpdate，说明进行了拖拽操作，不应该打开详情面板
        if (hasCalledUpdate) {
          // 拖拽操作，不打开详情面板
        } else if (hasMoved || hasUpdated) {
          // 有移动或更新，不打开详情面板
        } else {
          // 真正的点击操作，打开详情面板
          if (onClick) {
            onClick();
          }
        }
        
        // 重置拖拽状态
        dragStateRef.current = { hasMoved: false, hasUpdated: false, hasCalledUpdate: false };
        dragPhaseRef.current = 'idle';
        setIsDragging(false);
        setIsDragPending(false);
        setDragStart({ x: 0, date: new Date(), hasMoved: false });
        // 不立即清除本地状态，等待API响应后再清除
        // 这样可以避免在API响应返回前UI闪烁
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragPending, isDragging, dragStart.x, dragStart.date, cellWidth, taskDuration, startDate, task, onUpdate, onClick]);

  // 处理进度调整的逻辑
  React.useEffect(() => {
    if (isProgressAdjusting && barRef.current) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const barRect = barRef.current!.getBoundingClientRect();
        const x = e.clientX - barRect.left;
        const newProgress = Math.max(0, Math.min(100, (x / barRect.width) * 100));
        
        const updatedTask = {
          ...task,
          progress: Math.round(newProgress),
        };
        // 立即更新本地状态以显示实时效果
        setLocalTask(updatedTask);
        onUpdate(updatedTask);
      };

      const handleGlobalMouseUp = () => {
        setIsProgressAdjusting(false);
        setProgressStart({ x: 0, progress: 0 });
        // 不立即清除本地状态，等待API响应后再清除
        // 这样可以避免在API响应返回前UI闪烁
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isProgressAdjusting, task, onUpdate]);

  const progressWidth = (width * displayTask.progress) / 100;

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
      title={displayTask.name}
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
          backgroundColor: displayTask.color || '#4a90e2',
        }}
      />
      <div 
        className={`task-bar-label ${displayTask.progress > 25 ? 'task-bar-label-white-text' : 'task-bar-label-dark-text'}`}
      >
        {displayTask.name}
      </div>
      
      {/* 右侧调整大小手柄 */}
      <div
        className="task-bar-resize-handle task-bar-resize-handle-right"
        style={{ right: 0, width: `${RESIZE_HANDLE_WIDTH}px` }}
      />
    </div>
  );
};
