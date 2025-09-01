import React from 'react';
import ReactDOM from 'react-dom';
import { format, getDay, eachDayOfInterval, getYear, addDays, isAfter, startOfDay } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import './HabitCard.css';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getHabitStats } from '../utils/tierSystem';
import { applyThemeToDocument } from '../utils/themeCustomization';

const HabitCard = ({ habit, onComplete, onDelete, onEdit, onPlan, onArchive, onUnarchive, isReadOnly = false, viewMode = 'year', isPremium = false, isArchived = false, onEditDialogChange, onDeleteDialogChange, onLogProgressDialogChange, onMoreMenuChange, friendTheme = null }) => {
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
  const [planDate, setPlanDate] = React.useState(null);

  const [editIsQuantifiable, setEditIsQuantifiable] = React.useState(habit.is_quantifiable || false);
  const [editTargetValue, setEditTargetValue] = React.useState(habit.target_value || '');
  const [editMetricUnit, setEditMetricUnit] = React.useState(habit.metric_unit || '');
  const [editIsPrivate, setEditIsPrivate] = React.useState(habit.is_private || false);
  const [editHasInsights, setEditHasInsights] = React.useState(habit.has_insights || false);
  const [editInsightSettings, setEditInsightSettings] = React.useState(habit.insight_settings || {
    showCurrentStreak: true,
    showTotalDays: true,
    showProgressBar: true
  });
  const [quantifiableValue, setQuantifiableValue] = React.useState('');
  
  // Year navigation state
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  
  // Enhanced insights calculation - now available for all users
  const insights = React.useMemo(() => {
    if (!habit.has_insights || !habit.habit_completions) return null;
    
    const allCompletions = habit.habit_completions;
    // Filter out 0-value completions for quantifiable habits
    const completions = allCompletions.filter(completion => {
      if (habit.is_quantifiable) {
        return (completion.value || 0) > 0;
      }
      return true; // For non-quantifiable habits, all completions count
    });
    const totalDays = completions.length;
    
    if (totalDays === 0) return null;
    
    const today = new Date();
    const sortedCompletions = [...completions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate current streak (including current day)
    let currentStreak = 0;
    for (let i = 0; i < sortedCompletions.length; i++) {
      const completionDate = new Date(sortedCompletions[i].date);
      const daysDiff = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return {
      currentStreak,
      totalCompletions: totalDays
    };
  }, [habit.has_insights, habit.habit_completions]);

  // Tier system stats
  const tierStats = React.useMemo(() => {
    return getHabitStats(habit);
  }, [habit]);

  // Update state when habit changes
  React.useEffect(() => {
    setEditName(habit.name);

    setEditIsQuantifiable(habit.is_quantifiable || false);
    setEditTargetValue(habit.target_value || '');
    setEditMetricUnit(habit.metric_unit || '');
    setEditIsPrivate(habit.is_private || false);
    setEditHasInsights(habit.has_insights || false);
    setEditInsightSettings(habit.insight_settings || {
      showCurrentStreak: true,
      showTotalDays: true,
      showProgressBar: true
    });
  }, [habit.name, habit.is_quantifiable, habit.target_value, habit.metric_unit, habit.is_private, habit.has_insights, habit.insight_settings]);

  // Update edit dialog state change
  React.useEffect(() => {
    if (onEditDialogChange) {
      onEditDialogChange(isEditOpen);
    }
  }, [isEditOpen]); // Only depend on isEditOpen, not the callback function

  // Update delete dialog state change
  React.useEffect(() => {
    if (onDeleteDialogChange) {
      onDeleteDialogChange(isDeleteOpen);
    }
  }, [isDeleteOpen]); // Only depend on isDeleteOpen, not the callback function

  // Update log progress dialog state change
  React.useEffect(() => {
    if (onLogProgressDialogChange) {
      onLogProgressDialogChange(isOpen);
    }
  }, [isOpen]); // Only depend on isOpen, not the callback function

  // Update more menu state change
  React.useEffect(() => {
    if (onMoreMenuChange) {
      onMoreMenuChange(isMoreOpen);
    }
  }, [isMoreOpen]); // Only depend on isMoreOpen, not the callback function

  // Note: We don't apply friend's theme globally here to avoid conflicts
  // Instead, we pass the theme data to the component and use it conditionally

  const moreButtonRef = React.useRef(null);
  const tooltipRef = React.useRef(null);

  // Cache current year for performance
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  
  // Navigation functions
  const goToPreviousYear = () => {
    setSelectedYear(prev => prev - 1);
  };
  
  const goToNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };
  
  // Allow going back to any reasonable year (e.g., 2015 onwards) and forward to any future year
  const minAllowedYear = 2015;
  const maxAllowedYear = currentYear + 10; // Cap at 10 years in the future
  const canGoToPreviousYear = selectedYear > minAllowedYear;
  const canGoToNextYear = selectedYear < maxAllowedYear;





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
        // Treat 0 values as unlogged - no completion record should exist for 0
        const isActuallyLogged = value > 0;
        const progress = isActuallyLogged ? Math.min(value / target, 1) : 0; // Cap at 100%
        return {
          date,
          completed: value >= target,
          value,
          target,
          progress,
          isLogged: isActuallyLogged
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

  const handleDateClick = (date, isFuture) => {
    if (isReadOnly) return;

    if (isFuture) {
      setPlanDate(date); // Open planning confirmation dialog
    } else {
      // Existing logic for past/present dates
      const dateStr = format(date, 'yyyy-MM-dd');
      const completion = habit.habit_completions?.find(c => format(new Date(c.date), 'yyyy-MM-dd') === dateStr);
      setSelectedDate(date);
      setIsDateCompleted(!!completion);

      if (habit.is_quantifiable) {
        setQuantifiableValue(completion?.value || '');
        setIsOpen(true);
      } else {
        onComplete(habit.id, date, !!completion);
      }
    }
  };

  const handleLogToday = () => {
    handleDateClick(new Date(), false);
  };

  const handleComplete = React.useCallback(async () => {
    try {
      if (habit.is_quantifiable) {
        const value = parseFloat(quantifiableValue) || 0;
        // Ensure value is not negative
        const safeValue = Math.max(0, value);
        
        if (safeValue === 0) {
          // If logging 0, treat it as removing/undoing the completion
          await onComplete(habit.id, selectedDate, true);
        } else {
          await onComplete(habit.id, selectedDate, false, safeValue);
        }
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
      // Check if insights are enabled but no specific insights are selected
      let finalHasInsights = editHasInsights;
      let finalInsightSettings = editInsightSettings;
      
      if (editHasInsights) {
        const hasAnyInsightSelected = Object.values(editInsightSettings).some(value => value === true);
        if (!hasAnyInsightSelected) {
          // Disable insights if enabled but no specific insights are chosen
          finalHasInsights = false;
          finalInsightSettings = null;
        }
      }
      
      const editData = {
        name: editName,
        color: habit.color || '#000000',
        is_quantifiable: editIsQuantifiable,
        target_value: editIsQuantifiable ? Math.max(1, parseFloat(editTargetValue) || 1) : null,
        metric_unit: editIsQuantifiable ? editMetricUnit : null,
        is_private: editIsPrivate,
        has_insights: finalHasInsights,
        insight_settings: finalHasInsights ? finalInsightSettings : null
      };
      await onEdit(habit.id, editData);
      setIsEditOpen(false);
    } catch (error) {
      // Error is handled by parent component
    }
  }, [habit.id, editName, editIsQuantifiable, editTargetValue, editMetricUnit, editIsPrivate, editHasInsights, editInsightSettings, onEdit, habit.color]);

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

  // Determine if this habit should use custom theme styling
  // Apply custom theme when:
  // 1. Not in read-only mode (own habits), OR
  // 2. In read-only mode but friend's theme is available (friend's habits)
  const shouldUseCustomTheme = !isReadOnly || (isReadOnly && friendTheme);
  
  // Determine which theme to use
  const themeToUse = isReadOnly && friendTheme ? friendTheme : null;
  
  // Apply friend's theme locally if available
  const friendThemeStyles = React.useMemo(() => {
    if (isReadOnly && friendTheme) {
      return {
        '--custom-button-color': friendTheme.buttonColor ? `rgba(${parseInt(friendTheme.buttonColor.slice(1, 3), 16)}, ${parseInt(friendTheme.buttonColor.slice(3, 5), 16)}, ${parseInt(friendTheme.buttonColor.slice(5, 7), 16)}, ${friendTheme.buttonOpacity || 1})` : undefined,
        '--custom-button-text-color': friendTheme.buttonTextColor ? `rgba(${parseInt(friendTheme.buttonTextColor.slice(1, 3), 16)}, ${parseInt(friendTheme.buttonTextColor.slice(3, 5), 16)}, ${parseInt(friendTheme.buttonTextColor.slice(5, 7), 16)}, ${friendTheme.buttonTextOpacity || 1})` : undefined,
        '--custom-habit-card-color': friendTheme.habitCardColor ? `rgba(${parseInt(friendTheme.habitCardColor.slice(1, 3), 16)}, ${parseInt(friendTheme.habitCardColor.slice(3, 5), 16)}, ${parseInt(friendTheme.habitCardColor.slice(5, 7), 16)}, ${friendTheme.habitCardOpacity || 1})` : undefined,
        '--custom-habit-card-text-color': friendTheme.habitCardTextColor ? `rgba(${parseInt(friendTheme.habitCardTextColor.slice(1, 3), 16)}, ${parseInt(friendTheme.habitCardTextColor.slice(3, 5), 16)}, ${parseInt(friendTheme.habitCardTextColor.slice(5, 7), 16)}, ${friendTheme.habitCardTextOpacity || 1})` : undefined,
        '--custom-completed-cell-color': friendTheme.completedCellColor ? `rgba(${parseInt(friendTheme.completedCellColor.slice(1, 3), 16)}, ${parseInt(friendTheme.completedCellColor.slice(3, 5), 16)}, ${parseInt(friendTheme.completedCellColor.slice(5, 7), 16)}, ${friendTheme.completedCellOpacity || 1})` : undefined,
        '--custom-uncompleted-cell-color': friendTheme.uncompletedCellColor ? `rgba(${parseInt(friendTheme.uncompletedCellColor.slice(1, 3), 16)}, ${parseInt(friendTheme.uncompletedCellColor.slice(3, 5), 16)}, ${parseInt(friendTheme.uncompletedCellColor.slice(5, 7), 16)}, ${friendTheme.uncompletedCellOpacity || 1})` : undefined,
        '--custom-future-cell-color': friendTheme.futureCellColor ? `rgba(${parseInt(friendTheme.futureCellColor.slice(1, 3), 16)}, ${parseInt(friendTheme.futureCellColor.slice(3, 5), 16)}, ${parseInt(friendTheme.futureCellColor.slice(5, 7), 16)}, ${friendTheme.futureCellOpacity || 1})` : undefined,
      };
    }
    return {};
  }, [isReadOnly, friendTheme]);

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        '--habit-color': habit.color || '#000000',
        ...friendThemeStyles
      }} 
      className={`habit-card ${shouldUseCustomTheme ? 'custom-habit-card' : ''}`}
      data-habit-id={habit.id}
    >
      <div className="habit-header">
        <div className="habit-title-section">
          {!isReadOnly && !isArchived && (
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
          {/* Year navigation - only show in year view mode */}
          {viewMode === 'year' && (
            <div className="year-navigation-inline">
              <button 
                className="year-nav-button-inline"
                onClick={goToPreviousYear}
                disabled={!canGoToPreviousYear}
                title="Previous year"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <div className="year-display-inline">{selectedYear}</div>
              <button 
                className="year-nav-button-inline"
                onClick={goToNextYear}
                disabled={!canGoToNextYear}
                title="Next year"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          )}
          {!isReadOnly && !isArchived && (
            <button 
              className={`log-button ${shouldUseCustomTheme ? 'custom-button' : ''}`}
              onClick={handleLogToday}
              style={{ backgroundColor: habit.color || '#000000' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20" />
              </svg>
              Log Today
            </button>
          )}
          {!isReadOnly && (
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
                <Dialog.Content 
                  className="more-menu"
                  style={{
                    position: 'fixed',
                    top: menuPosition.top,
                    right: menuPosition.right,
                    transform: 'none'
                  }}
                >
                  {!isArchived && (
                    <button 
                      className="menu-item" 
                      onClick={() => {
                        setIsMoreOpen(false);
                        setIsEditOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {isPremium && (
                    isArchived ? (
                      <button 
                        className="menu-item" 
                        onClick={() => {
                          setIsMoreOpen(false);
                          onUnarchive && onUnarchive(habit.id);
                        }}
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button 
                        className="menu-item" 
                        onClick={() => {
                          setIsMoreOpen(false);
                          onArchive && onArchive(habit.id);
                        }}
                      >
                        Archive
                      </button>
                    )
                  )}
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
                  
                  // Check if this date is in the future
                  const today = startOfDay(new Date());
                  const cellDay = startOfDay(cell.date);
                  const isFutureDate = isAfter(cellDay, today);
                  
                  const cellStyle = {};
                  if (habit.is_quantifiable) {
                    const progress = Math.min(cell.progress || 0, 1);
                    
                    if (cell.isLogged && progress > 0) {
                      // Calculate opacity and create a color blend
                      const opacity = 0.2 + (progress * 0.8);
                      
                      // Use CSS color-mix if available, otherwise fallback to opacity
                      if (shouldUseCustomTheme) {
                        cellStyle.backgroundColor = `color-mix(in srgb, var(--custom-completed-cell-color, var(--cell-completed)) ${Math.round(opacity * 100)}%, var(--custom-uncompleted-cell-color, var(--cell-empty)))`;
                      } else {
                        cellStyle.backgroundColor = `color-mix(in srgb, var(--cell-completed) ${Math.round(opacity * 100)}%, var(--cell-empty))`;
                      }
                      cellStyle.borderColor = habit.color || '#000000';
                    } else {
                      // 0 value or unlogged - treat as unlogged cell
                      if (shouldUseCustomTheme) {
                        cellStyle.backgroundColor = 'var(--custom-uncompleted-cell-color, var(--cell-empty))';
                      } else {
                        cellStyle.backgroundColor = 'var(--cell-empty)';
                      }
                    }
                  } else if (cell.completed) {
                    cellStyle.backgroundColor = habit.color || '#000000';
                    cellStyle.borderColor = habit.color || '#000000';
                  }
                  
                  // Style future dates differently
                  if (isFutureDate && shouldShowCell) {
                    // For quantifiable habits, multiply existing opacity; for others, set to 0.3
                    if (habit.is_quantifiable && cellStyle.opacity) {
                      cellStyle.opacity = cellStyle.opacity * 0.5;
                    } else if (!habit.is_quantifiable) {
                      cellStyle.opacity = '0.3';
                    }
                    cellStyle.cursor = 'pointer';
                  }
                  
                  const tooltipText = shouldShowCell ? 
                    (isFutureDate ? 
                      (!isArchived ? `${dayName}, ${dateStr}\nClick to plan this habit` : `${dayName}, ${dateStr}`) :
                      (habit.is_quantifiable ? 
                        `${dayName}, ${dateStr}\n${cell.value || 0}/${cell.target || 1} ${habit.metric_unit || 'times'}` :
                        `${dayName}, ${dateStr}${cell.completed ? ' (Completed)' : ''}`)) : '';
                  
                  return (
                    <div
                      key={`${weekday}-${weekIndex}`}
                      className={`heatmap-cell ${cell.completed ? 'completed' : ''} ${!shouldShowCell ? 'empty' : ''} ${habit.is_quantifiable && shouldShowCell ? 'quantifiable' : ''} ${habit.is_quantifiable && shouldShowCell && cell.isLogged && cell.progress > 0 ? 'quantifiable-progress' : ''} ${isFutureDate ? 'future' : ''}`}
                      style={cellStyle}
                      onClick={() => !isReadOnly && !isArchived && shouldShowCell && handleDateClick(cell.date, isFutureDate)}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for clearing, or positive numbers (including decimals)
                    if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                      setQuantifiableValue(value);
                    }
                  }}
                  placeholder={`Enter ${habit.metric_unit || 'times'}`}
                  min="0"
                  step="1"
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
              <button className="delete-habit-button" onClick={handleDelete}>Delete</button>
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
               <label>Tracking Type</label>
               <div className="tracking-type-toggle">
                 <button
                   type="button"
                   className={`tracking-option ${!editIsQuantifiable ? 'active' : ''}`}
                   onClick={() => setEditIsQuantifiable(false)}

                 >
                   Simple
                 </button>
                 <button
                   type="button"
                   className={`tracking-option ${editIsQuantifiable ? 'active' : ''}`}
                   onClick={() => setEditIsQuantifiable(true)}

                 >
                   Numerical
                 </button>
               </div>
               <p className="tracking-type-description">
                 Choose between simple or numerical logging.
               </p>
             </div>
            {editIsQuantifiable && (
              <>
                <div className="form-group">
                  <label htmlFor="edit-target-value">Daily Target</label>
                  <input
                    id="edit-target-value"
                    type="number"
                    value={editTargetValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for clearing, or positive numbers (including decimals)
                      if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                        setEditTargetValue(value);
                      }
                    }}
                    placeholder="e.g., 8, 30, 2"
                    min="0"
                    step="1"
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

                >
                  Public
                </button>
                <button
                  type="button"
                  className={`privacy-option ${editIsPrivate ? 'active' : ''}`}
                  onClick={() => setEditIsPrivate(true)}

                >
                  Private
                </button>
              </div>
              <p className="privacy-description">
                Private habits are only visible to you. Public habits can be viewed by other users
              </p>
            </div>
            <div className="form-group">
              <label>Analytics</label>
              <div className="insights-toggle">
                <button
                  type="button"
                  className={`insights-option ${!editHasInsights ? 'active' : ''}`}
                  onClick={() => setEditHasInsights(false)}
                >
                  Disabled
                </button>
                <button
                  type="button"
                  className={`insights-option ${editHasInsights ? 'active' : ''}`}
                  onClick={() => setEditHasInsights(true)}
                >
                  Enabled
                </button>
              </div>
              <p className="insights-description">
                Get powerful analytics including streaks, trends, and ranked progression
              </p>
              {editHasInsights && (
                <div className="insight-settings">
                  <p className="insight-settings-label">Choose which insights to display:</p>
                  <div className="insight-checkboxes">
                    <label className="insight-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editInsightSettings.showCurrentStreak}
                        onChange={(e) => setEditInsightSettings(prev => ({
                          ...prev,
                          showCurrentStreak: e.target.checked
                        }))}
                      />
                      <span>Current Streak</span>
                    </label>
                    <label className="insight-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editInsightSettings.showTotalDays}
                        onChange={(e) => setEditInsightSettings(prev => ({
                          ...prev,
                          showTotalDays: e.target.checked
                        }))}
                      />
                      <span>Total Completions</span>
                    </label>
                    <label className="insight-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editInsightSettings.showProgressBar}
                        onChange={(e) => setEditInsightSettings(prev => ({
                          ...prev,
                          showProgressBar: e.target.checked
                        }))}
                      />
                      <span>Rank Progress Bar</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="dialog-buttons">
              <button 
                onClick={handleEdit}
                className="save-button"
              >
                Save
              </button>
              <button onClick={() => setIsEditOpen(false)}>Cancel</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      <Dialog.Root open={!!planDate} onOpenChange={() => setPlanDate(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Plan Habit</Dialog.Title>
            <Dialog.Description>
              Add "{habit.name}" to your planner for {planDate?.toLocaleDateString()}?
            </Dialog.Description>
            <div className="dialog-buttons">
              <button
                className="save-button"
                onClick={() => {
                  if (planDate) {
                    onPlan(habit.id, format(planDate, 'yyyy-MM-dd'));
                  }
                  setPlanDate(null);
                }}
              >
                Confirm
              </button>
              <button onClick={() => setPlanDate(null)}>Cancel</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      {/* Bottom stats section with insights and tier progress */}
      {insights && habit.insight_settings && (
        (habit.insight_settings.showCurrentStreak || 
         habit.insight_settings.showTotalDays || 
         habit.insight_settings.showProgressBar) && (
        <div className="bottom-stats-section">
          {/* Insights section */}
          <div className="insights-bottom">
            {habit.insight_settings.showCurrentStreak && (
              <span className="insight-item">
                <span className="insight-value">{insights.currentStreak}</span> day streak
              </span>
            )}
            {habit.insight_settings.showTotalDays && (
              <span className="insight-item">
                <span className="insight-value">{insights.totalCompletions}</span> total
              </span>
            )}
          </div>

          {/* Tier Progress Section */}
          {habit.insight_settings.showProgressBar && (
            <div className="tier-progress-bottom">
              <div className="tier-info-compact">
                <div className="tier-current-compact">
                  <span className="tier-icon" style={{ color: tierStats.currentTier.color }}>
                    {tierStats.currentTier.icon}
                  </span>
                  <span className="tier-name-compact">{tierStats.currentTier.name}</span>
                  <span className="tier-days-compact">{tierStats.totalDays} days</span>
                </div>
              </div>
              <div className="tier-progress-bar-compact">
                <div 
                  className="tier-progress-fill-compact" 
                  style={{ 
                    width: `${tierStats.tierProgress * 100}%`,
                    backgroundColor: tierStats.currentTier.color 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ))}
      

    </div>
  );
};

export default React.memo(HabitCard); 