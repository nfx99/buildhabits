import React from 'react';
import ReactDOM from 'react-dom';
import { format, getDay, startOfYear, endOfYear, eachDayOfInterval, getYear, addDays, subDays } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import './HabitCard.css';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const HabitCard = ({ habit, onComplete, onDelete, onEdit, isReadOnly = false, viewMode = 'year' }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [isDateCompleted, setIsDateCompleted] = React.useState(false);
  const [editName, setEditName] = React.useState(habit.name);
  const [editColor, setEditColor] = React.useState(habit.color || '#000000');
  const [editIsQuantifiable, setEditIsQuantifiable] = React.useState(habit.is_quantifiable || false);
  const [editTargetValue, setEditTargetValue] = React.useState(habit.target_value || '');
  const [editMetricUnit, setEditMetricUnit] = React.useState(habit.metric_unit || 'times');
  const [editIsPrivate, setEditIsPrivate] = React.useState(habit.is_private || false);
  const [quantifiableValue, setQuantifiableValue] = React.useState('');
  
  // Year navigation state
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  // Update state when habit changes
  React.useEffect(() => {
    setEditName(habit.name);
    setEditColor(habit.color || '#000000');
    setEditIsQuantifiable(habit.is_quantifiable || false);
    setEditTargetValue(habit.target_value || '');
    setEditMetricUnit(habit.metric_unit || 'times');
    setEditIsPrivate(habit.is_private || false);
  }, [habit.name, habit.color, habit.is_quantifiable, habit.target_value, habit.metric_unit, habit.is_private]);
  const moreButtonRef = React.useRef(null);
  const tooltipRef = React.useRef(null);

  // Cache current year for performance
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  // Calculate available years based on habit completions
  const availableYears = React.useMemo(() => {
    if (!habit.habit_completions || habit.habit_completions.length === 0) {
      return [currentYear];
    }
    
    const years = new Set([currentYear]); // Always include current year
    habit.habit_completions.forEach(completion => {
      const year = new Date(completion.date).getFullYear();
      years.add(year);
    });
    
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }, [habit.habit_completions, currentYear]);
  
  // Navigation functions
  const goToPreviousYear = () => {
    setSelectedYear(prev => prev - 1);
  };
  
  const goToNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };
  
  // Allow going back to any reasonable year (e.g., 2020 onwards) and forward to current year
  const minAllowedYear = 2020;
  const canGoToPreviousYear = selectedYear > minAllowedYear;
  const canGoToNextYear = selectedYear < currentYear;

  // Predefined color options
  const colorOptions = [
    '#000000', // Black (new default)
    '#3A4F41', // Feldgrau
    '#984447', // Cordovan
    '#2563EB', // Blue
    '#DC2626', // Red
    '#059669', // Green
    '#D97706', // Orange
    '#7C2D92', // Purple
    '#0891B2', // Cyan
    '#65A30D', // Lime
    '#EC4899', // Pink
    '#374151', // Gray
    '#0D9488', // Teal
  ];



  const heatmapData = React.useMemo(() => {
    const now = new Date();
    let startDate, endDate;
    
    if (viewMode === '365days') {
      // Past 365 days view - normalize dates to avoid timezone/time issues
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 364);
    } else {
      // Calendar year view - use selected year
      startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
      endDate = new Date(selectedYear, 11, 31); // December 31st of selected year
    }
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const completion = habit.habit_completions?.find(
        completion => {
          // Normalize both dates to avoid timezone issues
          const completionDate = new Date(completion.date);
          const normalizedCompletionDate = format(completionDate, 'yyyy-MM-dd');
          return normalizedCompletionDate === dateStr;
        }
      );
      
      if (habit.is_quantifiable) {
        const value = completion?.value || 0;
        const target = habit.target_value || 1;
        const progress = Math.min(value / target, 1); // Cap at 100%
        return {
          date,
          completed: value >= target,
          value,
          target,
          progress
        };
      } else {
        return {
          date,
          completed: !!completion,
          value: completion ? 1 : 0
        };
      }
    });
  }, [habit.habit_completions, habit.is_quantifiable, habit.target_value, viewMode, selectedYear]);

  const dateGrid = React.useMemo(() => {
    const now = new Date();
    let startDate, endDate;
    
    if (viewMode === '365days') {
      // Normalize dates to avoid timezone/time issues
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 364);
    } else {
      // Calendar year view - use selected year
      startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
      endDate = new Date(selectedYear, 11, 31); // December 31st of selected year
    }
    
    const grid = [];
    
    // Create a map for faster lookups
    const completionMap = new Map();
    heatmapData.forEach(d => {
      completionMap.set(format(d.date, 'yyyy-MM-dd'), d);
    });
    
    if (viewMode === '365days') {
      // For 365 days view, create a more compact grid
      // Start from the first day of the week containing startDate
      const gridStartDate = addDays(startDate, -getDay(startDate));
      const totalWeeks = Math.ceil((endDate - gridStartDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
      

      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const row = [];
        
        for (let week = 0; week < totalWeeks; week++) {
          const cellDate = addDays(gridStartDate, week * 7 + dayOfWeek);
          
          // Normalize cellDate for comparison
          const normalizedCellDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
          
          const isOutsideRange = normalizedCellDate < startDate || normalizedCellDate > endDate;
          
          if (isOutsideRange) {
            row.push({ date: null, completed: false });
          } else {
            const cellDateStr = format(cellDate, 'yyyy-MM-dd');
            const dayData = completionMap.get(cellDateStr);
            row.push(dayData || { date: cellDate, completed: false });
          }
        }
        grid.push(row);
      }
    } else {
      // Calendar year view (original logic)
      const targetYear = selectedYear; // Use selected year instead of current year
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const row = [];
        let date = addDays(startDate, dayOfWeek - getDay(startDate));
        
        for (let week = 0; week < 53; week++) {
          const cellDate = addDays(date, week * 7);
          const isInTargetYear = getYear(cellDate) === targetYear;
          const isBeforeStart = isInTargetYear && cellDate < startDate;
          const isAfterEnd = isInTargetYear && cellDate > endDate;
          
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
    }
    
    return grid;
  }, [heatmapData, viewMode, selectedYear]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthLabels = React.useMemo(() => {
    const months = [];
    const now = new Date();
    let startDate, totalWeeks;
    
    if (viewMode === '365days') {
      // Normalize dates to avoid timezone/time issues
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 364);
      const gridStartDate = addDays(startDate, -getDay(startDate));
      totalWeeks = Math.ceil((endDate - gridStartDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
    } else {
      // Calendar year view - use selected year
      startDate = new Date(selectedYear, 0, 1);
      totalWeeks = 53;
    }
    
    let currentMonth = '';
    
    for (let week = 0; week < totalWeeks; week++) {
      let weekDate;
      
      if (viewMode === '365days') {
        const gridStartDate = addDays(startDate, -getDay(startDate));
        weekDate = addDays(gridStartDate, week * 7);
      } else {
        weekDate = addDays(startDate, (week * 7) - getDay(startDate));
      }
      
      const monthName = format(weekDate, 'MMM');
      
      // For 365 days view, show all month changes
      // For year view, only show months in selected year
      const shouldShowLabel = viewMode === '365days' 
        ? monthName !== currentMonth
        : monthName !== currentMonth && getYear(weekDate) === selectedYear;
      
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
  }, [viewMode, selectedYear]);

  const handleDateClick = (date) => {
    if (!date) return;
    
    // Find existing completion for this date
    const existingCompletion = habit.habit_completions?.find(
      completion => {
        const completionDate = format(new Date(completion.date), 'yyyy-MM-dd');
        const originalDate = format(date, 'yyyy-MM-dd');
        return completionDate === originalDate;
      }
    );
    
    const isCompleted = !!existingCompletion;
    
    // Use the original date - no adjustment needed
    setSelectedDate(date);
    setIsDateCompleted(isCompleted);
    
    // For quantifiable habits, pre-populate the value if it exists
    if (habit.is_quantifiable && existingCompletion?.value) {
      setQuantifiableValue(existingCompletion.value.toString());
    } else {
      setQuantifiableValue('');
    }
    
    setIsOpen(true);
  };

  const handleLogToday = React.useCallback(async () => {
    const today = new Date();
    
    if (habit.is_quantifiable) {
      // For quantifiable habits, open the dialog to input value
      setSelectedDate(today);
      const existingCompletion = habit.habit_completions?.find(
        completion => {
          const completionDate = format(new Date(completion.date), 'yyyy-MM-dd');
          const todayDate = format(today, 'yyyy-MM-dd');
          return completionDate === todayDate;
        }
      );
      setIsDateCompleted(!!existingCompletion);
      if (existingCompletion?.value) {
        setQuantifiableValue(existingCompletion.value.toString());
      }
      setIsOpen(true);
    } else {
      // For simple habits, toggle completion directly
    const isCompleted = habit.habit_completions?.some(
      completion => {
        const completionDate = format(new Date(completion.date), 'yyyy-MM-dd');
        const todayDate = format(today, 'yyyy-MM-dd');
        return completionDate === todayDate;
      }
    ) || false;
    
    try {
      await onComplete(habit.id, today, isCompleted);
    } catch (error) {
      // Error is handled by parent component
    }
    }
  }, [habit.id, habit.habit_completions, habit.is_quantifiable, onComplete]);

  const handleComplete = React.useCallback(async () => {
    try {
      if (habit.is_quantifiable) {
        const value = parseFloat(quantifiableValue) || 0;
        await onComplete(habit.id, selectedDate, false, value);
      } else {
      await onComplete(habit.id, selectedDate);
      }
      setIsOpen(false);
      setQuantifiableValue('');
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, selectedDate, habit.is_quantifiable, quantifiableValue, onComplete]);

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
      const editData = {
        name: editName,
        color: editColor,
        is_quantifiable: editIsQuantifiable,
        target_value: editIsQuantifiable ? parseFloat(editTargetValue) || 1 : null,
        metric_unit: editIsQuantifiable ? editMetricUnit : null,
        is_private: editIsPrivate
      };
      await onEdit(habit.id, editData);
      setIsEditOpen(false);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, editName, editColor, editIsQuantifiable, editTargetValue, editMetricUnit, editIsPrivate, onEdit]);

  const showTooltip = (event) => {
    if (!tooltipRef.current) return;
    
    const cell = event.currentTarget;
    const tooltipText = cell.getAttribute('data-tooltip');
    if (!tooltipText) return;
    
    const tooltip = tooltipRef.current;
    tooltip.innerHTML = tooltipText.replace(/\n/g, '<br>');
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
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        '--habit-color': habit.color || '#000000'
      }} 
      className="habit-card"
    >
      <div className="habit-header">
        <div className="habit-title-section">
          {!isReadOnly && (
            <button 
              className="drag-handle"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
            >
              ⋮⋮
            </button>
          )}
          <h3>
            {habit.name}
            {habit.is_private && (
              <span className="privacy-indicator" title="Private habit">
                🔒
              </span>
            )}
          </h3>
        </div>
        <div className="habit-actions">
          {!isReadOnly && (
            <>
              {/* Year navigation - only show in year view mode */}
              {viewMode === 'year' && (
                <div className="year-navigation-inline">
                  <button 
                    className="year-nav-button-inline" 
                    onClick={goToPreviousYear}
                    disabled={!canGoToPreviousYear}
                    aria-label="Previous year"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18L9 12L15 6" />
                    </svg>
                  </button>
                  <span className="year-display-inline">{selectedYear}</span>
                  <button 
                    className="year-nav-button-inline" 
                    onClick={goToNextYear}
                    disabled={!canGoToNextYear}
                    aria-label="Next year"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18L15 12L9 6" />
                    </svg>
                  </button>
                </div>
              )}
              <button 
                className="log-button" 
                onClick={handleLogToday}
                style={{ backgroundColor: habit.color || '#000000' }}
              >
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
            </>
          )}
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
                  
                  // In 365-day view, show all dates in range; in year view, only show selected year
                  const shouldShowCell = viewMode === '365days' || getYear(cell.date) === selectedYear;
                  const dayName = shouldShowCell ? format(cell.date, 'EEEE') : '';
                  const dateStr = shouldShowCell ? format(cell.date, 'MMMM dd, yyyy') : '';
                  
                  const cellStyle = {};
                  if (habit.is_quantifiable) {
                    if (cell.progress > 0) {
                      // For quantifiable habits, show partial progress
                      const intensity = Math.min(cell.progress, 1);
                      const baseColor = habit.color || '#000000';
                      cellStyle.backgroundColor = `${baseColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
                      cellStyle.borderColor = baseColor;
                    }
                  } else if (cell.completed) {
                    cellStyle.backgroundColor = habit.color || '#000000';
                    cellStyle.borderColor = habit.color || '#000000';
                  }
                  
                  const tooltipText = shouldShowCell ? 
                    (habit.is_quantifiable ? 
                      `${dayName}, ${dateStr}\n${cell.value || 0}/${cell.target || 1} ${habit.metric_unit || 'times'}` :
                      `${dayName}, ${dateStr}${cell.completed ? ' ✓' : ''}`) : '';
                  
                  return (
                    <div
                      key={`${weekday}-${weekIndex}`}
                      className={`heatmap-cell ${cell.completed ? 'completed' : ''} ${!shouldShowCell ? 'empty' : ''} ${habit.is_quantifiable && cell.progress > 0 && cell.progress < 1 ? 'partial' : ''}`}
                      style={cellStyle}
                      onClick={() => !isReadOnly && shouldShowCell && handleDateClick(cell.date)}
                      data-tooltip={tooltipText}
                      onMouseEnter={(e) => shouldShowCell && showTooltip(e)}
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
            <Dialog.Title>
              {habit.is_quantifiable ? 'Log Progress' : (isDateCompleted ? 'Undo Habit' : 'Complete Habit')}
            </Dialog.Title>
            <Dialog.Description>
              {habit.is_quantifiable 
                ? `Log your progress for ${habit.name} on ${format(selectedDate, 'MMMM dd, yyyy')}`
                : (isDateCompleted 
                ? `Remove completion for ${habit.name} on ${format(selectedDate, 'MMMM dd, yyyy')}?`
                  : `Mark ${habit.name} as completed for ${format(selectedDate, 'MMMM dd, yyyy')}?`)
              }
            </Dialog.Description>
            {habit.is_quantifiable && (
              <div className="form-group">
                <label htmlFor="quantifiable-value">
                  Amount ({habit.metric_unit || 'times'}) - Target: {habit.target_value || 1}
                </label>
                <input
                  id="quantifiable-value"
                  type="number"
                  value={quantifiableValue}
                  onChange={(e) => setQuantifiableValue(e.target.value)}
                  placeholder={`Enter ${habit.metric_unit || 'times'}`}
                  min="0"
                  step="0.1"
                  className="edit-input"
                />
              </div>
            )}
            <div className="dialog-buttons">
              {habit.is_quantifiable ? (
                <button onClick={handleComplete}>Log Progress</button>
              ) : (isDateCompleted ? (
                <button className="undo-button" onClick={handleUndo}>Undo</button>
              ) : (
                <button onClick={handleComplete}>Complete</button>
              ))}
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
              Change the name, color, and tracking settings of your habit.
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
            <div className="form-group">
              <label htmlFor="habit-color">Habit Color</label>
              <div className="color-picker">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${editColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
                         <div className="form-group">
               <label>Tracking Type</label>
               <div className="tracking-type-toggle">
                 <button
                   type="button"
                   className={`tracking-option ${!editIsQuantifiable ? 'active' : ''}`}
                   onClick={() => setEditIsQuantifiable(false)}
                   style={!editIsQuantifiable ? { backgroundColor: editColor, borderColor: editColor } : {}}
                 >
                   Simple
                 </button>
                 <button
                   type="button"
                   className={`tracking-option ${editIsQuantifiable ? 'active' : ''}`}
                   onClick={() => setEditIsQuantifiable(true)}
                   style={editIsQuantifiable ? { backgroundColor: editColor, borderColor: editColor } : {}}
                 >
                   Numbers
                 </button>
               </div>
             </div>
            {editIsQuantifiable && (
              <>
                <div className="form-group">
                  <label htmlFor="edit-target-value">Daily Target</label>
                  <input
                    id="edit-target-value"
                    type="number"
                    value={editTargetValue}
                    onChange={(e) => setEditTargetValue(e.target.value)}
                    placeholder="e.g., 8, 30, 2"
                    min="0"
                    step="0.1"
                    className="edit-input"
                    required
                  />
                </div>
                                 <div className="form-group">
                   <label htmlFor="edit-metric-unit">Unit of Measurement</label>
                   <input
                     id="edit-metric-unit"
                     type="text"
                     value={editMetricUnit}
                     onChange={(e) => setEditMetricUnit(e.target.value)}
                     placeholder="e.g., times, minutes, pages, cups"
                     className="edit-input"
                     required
                   />
                 </div>
              </>
            )}
            <div className="form-group">
              <label>Privacy Setting</label>
              <div className="privacy-toggle">
                <button
                  type="button"
                  className={`privacy-option ${!editIsPrivate ? 'active' : ''}`}
                  onClick={() => setEditIsPrivate(false)}
                  style={!editIsPrivate ? { backgroundColor: editColor, borderColor: editColor } : {}}
                >
                  Public
                </button>
                <button
                  type="button"
                  className={`privacy-option ${editIsPrivate ? 'active' : ''}`}
                  onClick={() => setEditIsPrivate(true)}
                  style={editIsPrivate ? { backgroundColor: editColor, borderColor: editColor } : {}}
                >
                  Private
                </button>
              </div>
              <p className="privacy-description">
                Private habits are only visible to you. Public habits can be viewed by other users.
              </p>
            </div>
            <div className="dialog-buttons">
              <button 
                onClick={handleEdit}
                style={{ 
                  backgroundColor: editColor, 
                  borderColor: editColor,
                  boxShadow: 'none',
                  transform: 'none'
                }}
                className="save-button"
              >
                Save
              </button>
              <button onClick={() => setIsEditOpen(false)}>Cancel</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default React.memo(HabitCard); 