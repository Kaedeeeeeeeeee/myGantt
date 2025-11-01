import React, { useState } from 'react';
import { formatDate, getDaysInRange, getCellWidth, getDaysBetween, formatYearMonth } from '../../utils/dateUtils';
import { useI18n } from '../../contexts/I18nContext';
import { ViewMode } from '../../types';
import './Timeline.css';

interface TimelineProps {
  startDate: Date;
  endDate: Date;
  viewMode: ViewMode;
  scrollLeft?: number;
  onHoveredDate?: (date: Date | null) => void;
  hoveredDate?: Date | null; // 外部传入的悬停日期
}

export const Timeline: React.FC<TimelineProps> = ({ startDate, endDate, viewMode, onHoveredDate, hoveredDate: externalHoveredDate }) => {
  const { t, language } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const cellWidth = getCellWidth(viewMode);
  const days = getDaysInRange(startDate, endDate);
  
  // 判断是否是今天
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // 判断是否是周末（周六或周日）
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = 周日, 6 = 周六
  };
  
  // 渲染年月行（第一行）
  const renderYearMonthRow = () => {
    if (viewMode !== 'day') return null;
    
    const monthGroups: { [key: string]: { startIndex: number; endIndex: number; month: string; year: string } } = {};
    let currentMonth = '';
    let currentYear = '';
    let monthStartIndex = 0;
    
    days.forEach((day, index) => {
      const year = day.getFullYear().toString();
      const month = formatYearMonth(day, language);
      
      if (month !== currentMonth || year !== currentYear) {
        // 新月份开始
        if (currentMonth) {
          // 保存上一个月份的信息
          const key = `${currentYear}-${currentMonth}`;
          if (!monthGroups[key]) {
            monthGroups[key] = {
              startIndex: monthStartIndex,
              endIndex: index - 1,
              month: currentMonth,
              year: currentYear,
            };
          }
        }
        currentMonth = month;
        currentYear = year;
        monthStartIndex = index;
      }
    });
    
    // 保存最后一个月份
    if (currentMonth) {
      const key = `${currentYear}-${currentMonth}`;
      monthGroups[key] = {
        startIndex: monthStartIndex,
        endIndex: days.length - 1,
        month: currentMonth,
        year: currentYear,
      };
    }
    
    return (
      <div className="timeline-year-month-row">
        {Object.values(monthGroups).map((group, idx) => (
          <div
            key={`${group.year}-${group.month}-${idx}`}
            className="timeline-year-month-label"
            style={{
              left: `${group.startIndex * cellWidth}px`,
              width: `${(group.endIndex - group.startIndex + 1) * cellWidth}px`,
            }}
          >
            {group.month}
          </div>
        ))}
      </div>
    );
  };

  // 按周或月分组显示
  const renderHeader = () => {
    if (viewMode === 'day') {
      return days.map((day, index) => {
        const today = isToday(day);
        const weekend = isWeekend(day);
        // 检查是否是外部传入的悬停日期，或者内部悬停的索引
        const isHovered = externalHoveredDate ? (
          day.getFullYear() === externalHoveredDate.getFullYear() &&
          day.getMonth() === externalHoveredDate.getMonth() &&
          day.getDate() === externalHoveredDate.getDate()
        ) : (hoveredIndex === index);
        return (
          <div
            key={`${day.getTime()}-${index}`}
            className={`timeline-cell ${today ? 'timeline-cell-today' : ''} ${weekend ? 'timeline-cell-weekend' : ''} ${isHovered ? 'timeline-cell-hovered' : ''}`}
            style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
            onMouseEnter={() => {
              setHoveredIndex(index);
              if (onHoveredDate) {
                onHoveredDate(day);
              }
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
              if (onHoveredDate && !externalHoveredDate) {
                onHoveredDate(null);
              }
            }}
          >
            {today && <div className="today-indicator">{t('date.today')}</div>}
            <div className={`timeline-day ${today ? 'timeline-day-today' : ''}`}>
              {formatDate(day, 'dd')}
            </div>
            <div className="timeline-weekday">{formatDate(day, 'E')}</div>
          </div>
        );
      });
    }
    
    // 周和月的视图需要更复杂的逻辑
    return days.map((day, index) => {
      const isStartOfWeek = index === 0 || day.getDay() === 1;
      const width = isStartOfWeek && viewMode === 'week' ? cellWidth * 7 : cellWidth;
      const today = isToday(day);
      const weekend = isWeekend(day);
      
      const isHovered = externalHoveredDate ? (
        day.getFullYear() === externalHoveredDate.getFullYear() &&
        day.getMonth() === externalHoveredDate.getMonth() &&
        day.getDate() === externalHoveredDate.getDate()
      ) : (hoveredIndex === index && isStartOfWeek);
      return (
        <div
          key={`${day.getTime()}-${index}`}
          className={`timeline-cell ${today ? 'timeline-cell-today' : ''} ${weekend ? 'timeline-cell-weekend' : ''} ${isHovered ? 'timeline-cell-hovered' : ''}`}
          style={{ width: `${viewMode === 'week' ? (isStartOfWeek ? width : 0) : cellWidth}px`, minWidth: `${cellWidth}px` }}
          onMouseEnter={() => {
            if (isStartOfWeek) {
              setHoveredIndex(index);
              if (onHoveredDate) {
                onHoveredDate(day);
              }
            }
          }}
          onMouseLeave={() => {
            if (isStartOfWeek) {
              setHoveredIndex(null);
              if (onHoveredDate && !externalHoveredDate) {
                onHoveredDate(null);
              }
            }
          }}
        >
          {isStartOfWeek && (
            <>
              {today && <div className="today-indicator">{t('date.today')}</div>}
              <div className={`timeline-day ${today ? 'timeline-day-today' : ''}`}>
                {formatDate(day, 'dd')}
              </div>
              <div className="timeline-weekday">{formatDate(day, 'E')}</div>
            </>
          )}
        </div>
      );
    });
  };

  return (
    <div className="timeline-container">
      {renderYearMonthRow()}
      <div className="timeline-header">
        {renderHeader()}
      </div>
    </div>
  );
};
