import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_THEME, 
  updateUserTheme, 
  resetUserTheme, 
  validateTheme, 
  analyzeContrast,
  applyThemeToDocument 
} from '../utils/themeCustomization';
import './ThemeCustomizer.css';

const ThemeCustomizer = ({ 
  userId, 
  initialTheme = DEFAULT_THEME,
  onThemeUpdate,
  onThemeError,
  onThemePreview, // New prop for preview changes
  disabled = false 
}) => {
  const [theme, setTheme] = useState(initialTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Update local theme when initialTheme changes
  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  // Call preview function when theme changes (for local preview only)
  useEffect(() => {
    onThemePreview?.(theme);
  }, [theme, onThemePreview]);

  const handleColorChange = (property, value) => {
    if (disabled) return;
    
    setTheme(prev => ({
      ...prev,
      [property]: value
    }));
  };

  const handleOpacityChange = (property, value) => {
    if (disabled) return;
    
    const opacity = parseFloat(value);
    setTheme(prev => ({
      ...prev,
      [property]: opacity
    }));
  };

  const handleSaveTheme = async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);
    try {
      const result = await updateUserTheme(userId, theme);
      
      if (result.success) {
        // Apply theme globally only after successful save
        applyThemeToDocument(theme);
        onThemeUpdate?.(theme);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      onThemeError?.(error.message || 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTheme = async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);
    try {
      const result = await resetUserTheme(userId);
      
      if (result.success) {
        setTheme(DEFAULT_THEME);
        // Apply reset theme globally only after successful reset
        applyThemeToDocument(DEFAULT_THEME);
        onThemeUpdate?.(DEFAULT_THEME);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error resetting theme:', error);
      onThemeError?.(error.message || 'Failed to reset theme');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getContrastWarning = (bgColor, textColor) => {
    const analysis = analyzeContrast(bgColor, textColor);
    return !analysis.isAccessible ? analysis.suggestion : null;
  };

  return (
    <div className="theme-customizer">
      <div className="theme-customizer-header">
        <h4>Theme Customization</h4>
        <p className="theme-description">
          Customize colors and opacity for buttons and habit cards
        </p>
      </div>

      {/* Button Customization */}
      <div className="theme-section">
        <button 
          className={`theme-section-header ${expandedSection === 'buttons' ? 'expanded' : ''}`}
          onClick={() => toggleSection('buttons')}
          disabled={disabled}
        >
          <span>Button Styles</span>
          <span className="expand-icon">{expandedSection === 'buttons' ? '−' : '+'}</span>
        </button>
        
        {expandedSection === 'buttons' && (
          <div className="theme-section-content">
            {/* Button Color */}
            <div className="theme-control">
              <label htmlFor="button-color">Button Color</label>
              <div className="color-input-group">
                <input
                  id="button-color"
                  type="color"
                  value={theme.buttonColor}
                  onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.buttonColor}
                  onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Button Opacity */}
            <div className="theme-control">
              <label htmlFor="button-opacity">
                Button Opacity ({Math.round(theme.buttonOpacity * 100)}%)
              </label>
              <input
                id="button-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.buttonOpacity}
                onChange={(e) => handleOpacityChange('buttonOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Button Text Color */}
            <div className="theme-control">
              <label htmlFor="button-text-color">Button Text Color</label>
              <div className="color-input-group">
                <input
                  id="button-text-color"
                  type="color"
                  value={theme.buttonTextColor}
                  onChange={(e) => handleColorChange('buttonTextColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.buttonTextColor}
                  onChange={(e) => handleColorChange('buttonTextColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Button Text Opacity */}
            <div className="theme-control">
              <label htmlFor="button-text-opacity">
                Button Text Opacity ({Math.round(theme.buttonTextOpacity * 100)}%)
              </label>
              <input
                id="button-text-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.buttonTextOpacity}
                onChange={(e) => handleOpacityChange('buttonTextOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Button Contrast Warning */}
            {getContrastWarning(theme.buttonColor, theme.buttonTextColor) && (
              <div className="contrast-warning">
                ⚠️ {getContrastWarning(theme.buttonColor, theme.buttonTextColor)}
              </div>
            )}

            {/* Button Preview */}
            <div className="theme-preview">
              <button 
                className="preview-button"
                style={{
                  backgroundColor: `rgba(${parseInt(theme.buttonColor.slice(1, 3), 16)}, ${parseInt(theme.buttonColor.slice(3, 5), 16)}, ${parseInt(theme.buttonColor.slice(5, 7), 16)}, ${theme.buttonOpacity})`,
                  color: `rgba(${parseInt(theme.buttonTextColor.slice(1, 3), 16)}, ${parseInt(theme.buttonTextColor.slice(3, 5), 16)}, ${parseInt(theme.buttonTextColor.slice(5, 7), 16)}, ${theme.buttonTextOpacity})`
                }}
              >
                Preview Button
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Habit Card Customization */}
      <div className="theme-section">
        <button 
          className={`theme-section-header ${expandedSection === 'cards' ? 'expanded' : ''}`}
          onClick={() => toggleSection('cards')}
          disabled={disabled}
        >
          <span>Habit Card Styles</span>
          <span className="expand-icon">{expandedSection === 'cards' ? '−' : '+'}</span>
        </button>
        
        {expandedSection === 'cards' && (
          <div className="theme-section-content">
            {/* Habit Card Color */}
            <div className="theme-control">
              <label htmlFor="card-color">Habit Card Color</label>
              <div className="color-input-group">
                <input
                  id="card-color"
                  type="color"
                  value={theme.habitCardColor}
                  onChange={(e) => handleColorChange('habitCardColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.habitCardColor}
                  onChange={(e) => handleColorChange('habitCardColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Habit Card Opacity */}
            <div className="theme-control">
              <label htmlFor="card-opacity">
                Habit Card Opacity ({Math.round(theme.habitCardOpacity * 100)}%)
              </label>
              <input
                id="card-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.habitCardOpacity}
                onChange={(e) => handleOpacityChange('habitCardOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Habit Card Text Color */}
            <div className="theme-control">
              <label htmlFor="card-text-color">Habit Card Text Color</label>
              <div className="color-input-group">
                <input
                  id="card-text-color"
                  type="color"
                  value={theme.habitCardTextColor}
                  onChange={(e) => handleColorChange('habitCardTextColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.habitCardTextColor}
                  onChange={(e) => handleColorChange('habitCardTextColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#14000A"
                />
              </div>
            </div>

            {/* Habit Card Text Opacity */}
            <div className="theme-control">
              <label htmlFor="card-text-opacity">
                Habit Card Text Opacity ({Math.round(theme.habitCardTextOpacity * 100)}%)
              </label>
              <input
                id="card-text-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.habitCardTextOpacity}
                onChange={(e) => handleOpacityChange('habitCardTextOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Card Contrast Warning */}
            {getContrastWarning(theme.habitCardColor, theme.habitCardTextColor) && (
              <div className="contrast-warning">
                ⚠️ {getContrastWarning(theme.habitCardColor, theme.habitCardTextColor)}
              </div>
            )}

            {/* Habit Card Preview */}
            <div className="theme-preview">
              <div 
                className="preview-card"
                style={{
                  backgroundColor: `rgba(${parseInt(theme.habitCardColor.slice(1, 3), 16)}, ${parseInt(theme.habitCardColor.slice(3, 5), 16)}, ${parseInt(theme.habitCardColor.slice(5, 7), 16)}, ${theme.habitCardOpacity})`,
                  color: `rgba(${parseInt(theme.habitCardTextColor.slice(1, 3), 16)}, ${parseInt(theme.habitCardTextColor.slice(3, 5), 16)}, ${parseInt(theme.habitCardTextColor.slice(5, 7), 16)}, ${theme.habitCardTextOpacity})`
                }}
              >
                <h5>Sample Habit</h5>
                <p>This is how your habit cards will look</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Cell Customization */}
      <div className="theme-section">
        <button 
          className={`theme-section-header ${expandedSection === 'cells' ? 'expanded' : ''}`}
          onClick={() => toggleSection('cells')}
          disabled={disabled}
        >
          <span>Calendar Cell Styles</span>
          <span className="expand-icon">{expandedSection === 'cells' ? '−' : '+'}</span>
        </button>
        
        {expandedSection === 'cells' && (
          <div className="theme-section-content">
            {/* Completed Cell Color */}
            <div className="theme-control">
              <label htmlFor="completed-cell-color">Completed Cell Color</label>
              <div className="color-input-group">
                <input
                  id="completed-cell-color"
                  type="color"
                  value={theme.completedCellColor}
                  onChange={(e) => handleColorChange('completedCellColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.completedCellColor}
                  onChange={(e) => handleColorChange('completedCellColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Completed Cell Opacity */}
            <div className="theme-control">
              <label htmlFor="completed-cell-opacity">
                Completed Cell Opacity ({Math.round(theme.completedCellOpacity * 100)}%)
              </label>
              <input
                id="completed-cell-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.completedCellOpacity}
                onChange={(e) => handleOpacityChange('completedCellOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Uncompleted Cell Color */}
            <div className="theme-control">
              <label htmlFor="uncompleted-cell-color">Uncompleted Cell Color</label>
              <div className="color-input-group">
                <input
                  id="uncompleted-cell-color"
                  type="color"
                  value={theme.uncompletedCellColor}
                  onChange={(e) => handleColorChange('uncompletedCellColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.uncompletedCellColor}
                  onChange={(e) => handleColorChange('uncompletedCellColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#f9fafb"
                />
              </div>
            </div>

            {/* Uncompleted Cell Opacity */}
            <div className="theme-control">
              <label htmlFor="uncompleted-cell-opacity">
                Uncompleted Cell Opacity ({Math.round(theme.uncompletedCellOpacity * 100)}%)
              </label>
              <input
                id="uncompleted-cell-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.uncompletedCellOpacity}
                onChange={(e) => handleOpacityChange('uncompletedCellOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Future Cell Color */}
            <div className="theme-control">
              <label htmlFor="future-cell-color">Future Cell Color</label>
              <div className="color-input-group">
                <input
                  id="future-cell-color"
                  type="color"
                  value={theme.futureCellColor}
                  onChange={(e) => handleColorChange('futureCellColor', e.target.value)}
                  disabled={disabled}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={theme.futureCellColor}
                  onChange={(e) => handleColorChange('futureCellColor', e.target.value)}
                  disabled={disabled}
                  className="color-text-input"
                  placeholder="#f9fafb"
                />
              </div>
            </div>

            {/* Future Cell Opacity */}
            <div className="theme-control">
              <label htmlFor="future-cell-opacity">
                Future Cell Opacity ({Math.round(theme.futureCellOpacity * 100)}%)
              </label>
              <input
                id="future-cell-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={theme.futureCellOpacity}
                onChange={(e) => handleOpacityChange('futureCellOpacity', e.target.value)}
                disabled={disabled}
                className="opacity-slider"
              />
            </div>

            {/* Calendar Cell Preview */}
            <div className="theme-preview">
              <div className="cell-preview-container">
                <div 
                  className="preview-cell completed"
                  style={{
                    backgroundColor: `rgba(${parseInt(theme.completedCellColor.slice(1, 3), 16)}, ${parseInt(theme.completedCellColor.slice(3, 5), 16)}, ${parseInt(theme.completedCellColor.slice(5, 7), 16)}, ${theme.completedCellOpacity})`
                  }}
                  title="Completed"
                >
                </div>
                <div 
                  className="preview-cell uncompleted"
                  style={{
                    backgroundColor: `rgba(${parseInt(theme.uncompletedCellColor.slice(1, 3), 16)}, ${parseInt(theme.uncompletedCellColor.slice(3, 5), 16)}, ${parseInt(theme.uncompletedCellColor.slice(5, 7), 16)}, ${theme.uncompletedCellOpacity})`
                  }}
                  title="Uncompleted"
                >
                </div>
                <div 
                  className="preview-cell future"
                  style={{
                    backgroundColor: `rgba(${parseInt(theme.futureCellColor.slice(1, 3), 16)}, ${parseInt(theme.futureCellColor.slice(3, 5), 16)}, ${parseInt(theme.futureCellColor.slice(5, 7), 16)}, ${theme.futureCellOpacity})`
                  }}
                  title="Future"
                >
                </div>
              </div>
              <p className="cell-preview-labels">
                <span>Completed</span>
                <span>Uncompleted</span>
                <span>Future</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="theme-actions">
        <button
          className="save-theme-btn"
          onClick={handleSaveTheme}
          disabled={disabled || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Theme'}
        </button>
        <button
          className="reset-theme-btn"
          onClick={handleResetTheme}
          disabled={disabled || isSaving}
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};

export default ThemeCustomizer;
