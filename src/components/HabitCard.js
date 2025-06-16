import React from 'react';
import ReactDOM from 'react-dom';
import { format, getDay, startOfYear, endOfYear, eachDayOfInterval, getYear, addDays } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import './HabitCard.css';

const HabitCard = ({ habit, onComplete, onDelete, onEdit }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [isDateCompleted, setIsDateCompleted] = React.useState(false);
  const [editName, setEditName] = React.useState(habit.name);
  const moreButtonRef = React.useRef(null);
  const tooltipRef = React.useRef(null);

  // Cache current year for performance
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  const heatmapData = React.useMemo(() => {
    const startDate = startOfYear(new Date());
    const endDate = endOfYear(new Date());
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(date => ({
      date,
      completed: habit.habit_completions?.some(
        completion => format(new Date(completion.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ) || false
    }));
  }, [habit.habit_completions]);

  const dateGrid = React.useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const startDate = startOfYear(now);
    const endDate = endOfYear(now);
    const grid = [];
    
    // Create a map for faster lookups
    const completionMap = new Map();
    heatmapData.forEach(d => {
      completionMap.set(format(d.date, 'yyyy-MM-dd'), d);
    });
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const row = [];
      let date = addDays(startDate, dayOfWeek - getDay(startDate));
      
      for (let week = 0; week < 53; week++) {
        const cellDate = addDays(date, week * 7);
        const isInCurrentYear = getYear(cellDate) === currentYear;
        const isBeforeStart = isInCurrentYear && cellDate < startDate;
        const isAfterEnd = isInCurrentYear && cellDate > endDate;
        
        if (isBeforeStart || isAfterEnd) {
          row.push({ date: null, completed: false });
        } else {
          const cellDateStr = format(cellDate, 'yyyy-MM-dd');
          const dayData = completionMap.get(cellDateStr);
          row.push(dayData || { date: cellDate, completed: false });
        }
      }
      grid.push(row);
    }
    
    return grid;
  }, [heatmapData]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthLabels = React.useMemo(() => {
    const months = [];
    const now = new Date();
    const currentYear = getYear(now);
    const startDate = startOfYear(now);
    let currentMonth = '';
    
    for (let week = 0; week < 53; week++) {
      const weekDate = addDays(startDate, (week * 7) - getDay(startDate));
      const monthName = format(weekDate, 'MMM');
      
      // Only show the month label if it's a new month and not December from previous year
      const shouldShowLabel = monthName !== currentMonth && getYear(weekDate) === currentYear;
      
      months.push({
        week,
        month: monthName,
        showLabel: shouldShowLabel
      });
      
      if (shouldShowLabel) {
        currentMonth = monthName;
      }
    }
    
    return months;
  }, []);

  const handleDateClick = (date) => {
    if (!date) return;
    
    // Check completion using the original date (same as heatmap)
    const isCompleted = habit.habit_completions?.some(
      completion => {
        const completionDate = format(new Date(completion.date), 'yyyy-MM-dd');
        const originalDate = format(date, 'yyyy-MM-dd');
        return completionDate === originalDate;
      }
    ) || false;
    
    // Use the original date - no adjustment needed
    setSelectedDate(date);
    setIsDateCompleted(isCompleted);
    setIsOpen(true);
  };

  const handleLogToday = React.useCallback(async () => {
    const today = new Date();
    
    const isCompleted = habit.habit_completions?.some(
      completion => {
        const completionDate = format(new Date(completion.date), 'yyyy-MM-dd');
        const todayDate = format(today, 'yyyy-MM-dd');
        return completionDate === todayDate;
      }
    ) || false;
    
    try {
      // If already completed today, undo it. Otherwise, complete it.
      await onComplete(habit.id, today, isCompleted);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, habit.habit_completions, onComplete]);

  const handleComplete = React.useCallback(async () => {
    try {
      await onComplete(habit.id, selectedDate);
      setIsOpen(false);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, selectedDate, onComplete]);

  const handleUndo = React.useCallback(async () => {
    try {
      await onComplete(habit.id, selectedDate, true);
      setIsOpen(false);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, selectedDate, onComplete]);

  const handleDelete = React.useCallback(async () => {
    try {
      await onDelete(habit.id);
      setIsDeleteOpen(false);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, onDelete]);

  const handleEdit = React.useCallback(async () => {
    try {
      await onEdit(habit.id, editName);
      setIsEditOpen(false);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, editName, onEdit]);

  const showTooltip = (event) => {
    if (!tooltipRef.current) return;
    
    const cell = event.currentTarget;
    const tooltipText = cell.getAttribute('data-tooltip');
    if (!tooltipText) return;
    
    const tooltip = tooltipRef.current;
    tooltip.textContent = tooltipText;
    tooltip.style.display = 'block';
    
    // Calculate optimal position
    const cellRect = cell.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // Set content to measure actual dimensions
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Calculate position
    let x = cellRect.left + (cellRect.width / 2) - (tooltipRect.width / 2);
    let y = cellRect.top - tooltipRect.height - 8;
    
    // Adjust for clipping
    if (x + tooltipRect.width > viewportWidth - 10) {
      x = viewportWidth - tooltipRect.width - 10;
    }
    if (x < 10) {
      x = 10;
    }
    if (y < 10) {
      y = cellRect.bottom + 8;
    }
    
    // Apply position and make visible
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.style.visibility = 'visible';
  };

  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  };

  const handleMoreClick = (event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right
    });
    setIsMoreOpen(true);
  };

  return (
    <div className="habit-card">
      <div className="habit-header">
        <h3>{habit.name}</h3>
        <div className="habit-actions">
          <button className="log-button" onClick={handleLogToday}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20" />
            </svg>
            Log Today
          </button>
          <Dialog.Root open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <Dialog.Trigger asChild>
              <button 
                className="more-button" 
                onClick={handleMoreClick}
                ref={moreButtonRef}
                aria-label="More options"
              >
                ⋮
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content 
                className="more-menu"
                style={{
                  position: 'fixed',
                  top: menuPosition.top,
                  right: menuPosition.right,
                  transform: 'none'
                }}
              >
                <button 
                  className="menu-item" 
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsEditOpen(true);
                  }}
                >
                  Edit
                </button>
                <button 
                  className="menu-item delete" 
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsDeleteOpen(true);
                  }}
                >
                  Delete
                </button>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <div className="heatmap-container">
        <div className="heatmap">
          {/* Month labels row */}
          <div className="heatmap-months-row">
            <div className="day-label"></div>
            <div className="heatmap-months">
              {monthLabels.map((monthData, index) => (
                <div key={index} className="month-label">
                  {monthData.showLabel ? monthData.month : ''}
                </div>
              ))}
            </div>
          </div>
          
          {weekdays.map((weekday, dayIndex) => (
            <div key={weekday} className="heatmap-row">
              <div className="day-label">{weekday}</div>
              <div className="heatmap-cells">
                {dateGrid[dayIndex].map((cell, weekIndex) => {
                  if (!cell.date) {
                    return <div key={`${weekday}-${weekIndex}`} className="heatmap-cell empty" />;
                  }
                  const isInCurrentYear = getYear(cell.date) === currentYear;
                  const dayName = isInCurrentYear ? format(cell.date, 'EEEE') : '';
                  const dateStr = isInCurrentYear ? format(cell.date, 'MMMM dd, yyyy') : '';
                  return (
                    <div
                      key={`${weekday}-${weekIndex}`}
                      className={`heatmap-cell ${cell.completed ? 'completed' : ''} ${!isInCurrentYear ? 'empty' : ''}`}
                      onClick={() => isInCurrentYear && handleDateClick(cell.date)}
                      data-tooltip={isInCurrentYear ? `${dayName}, ${dateStr}` : ''}
                      onMouseEnter={(e) => isInCurrentYear && showTooltip(e)}
                      onMouseLeave={hideTooltip}
                    >
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom instant tooltip rendered to body to avoid clipping */}
      {ReactDOM.createPortal(
        <div
          ref={tooltipRef}
          className="custom-tooltip"
          style={{
            position: 'fixed',
            display: 'none',
            zIndex: 9999,
            pointerEvents: 'none',
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            padding: '0.4rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        />,
        document.body
      )}

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>{isDateCompleted ? 'Undo Habit' : 'Complete Habit'}</Dialog.Title>
            <Dialog.Description>
              {isDateCompleted 
                ? `Remove completion for ${habit.name} on ${format(selectedDate, 'MMMM dd, yyyy')}?`
                : `Mark ${habit.name} as completed for ${format(selectedDate, 'MMMM dd, yyyy')}?`
              }
            </Dialog.Description>
            <div className="dialog-buttons">
              {isDateCompleted ? (
                <button className="undo-button" onClick={handleUndo}>Undo</button>
              ) : (
                <button onClick={handleComplete}>Complete</button>
              )}
              <button onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Delete Habit</Dialog.Title>
            <Dialog.Description>
              Are you sure you want to delete "{habit.name}"? This action cannot be undone.
            </Dialog.Description>
            <div className="dialog-buttons">
              <button className="delete-confirm" onClick={handleDelete}>Delete</button>
              <button onClick={() => setIsDeleteOpen(false)}>Cancel</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isEditOpen} onOpenChange={setIsEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Edit Habit</Dialog.Title>
            <Dialog.Description>
              Change the name of your habit.
            </Dialog.Description>
            <div className="form-group">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="edit-input"
                placeholder="Habit name"
              />
            </div>
            <div className="dialog-buttons">
              <button onClick={handleEdit}>Save</button>
              <button onClick={() => setIsEditOpen(false)}>Cancel</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default React.memo(HabitCard); 