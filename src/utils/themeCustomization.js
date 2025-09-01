/**
 * Theme Customization Utilities
 * Handles user theme preferences for buttons, text, and habit cards
 */

import { supabase } from '../config/supabase';

// Default theme values
export const DEFAULT_THEME = {
  // Button styles
  buttonColor: '#000000',
  buttonOpacity: 1.0,
  buttonTextColor: '#FFFFFF',
  buttonTextOpacity: 1.0,
  
  // Habit card styles
  habitCardColor: '#FFFFFF',
  habitCardOpacity: 1.0,
  habitCardTextColor: '#14000A',
  habitCardTextOpacity: 1.0,
  
  // Calendar cell styles (matching original defaults)
  completedCellColor: '#000000',
  completedCellOpacity: 1.0,
  uncompletedCellColor: '#f9fafb',
  uncompletedCellOpacity: 1.0,
  futureCellColor: '#f9fafb',
  futureCellOpacity: 1.0
};

/**
 * Validates theme color (hex format)
 * @param {string} color - Color in hex format
 * @returns {boolean} - Whether color is valid
 */
export const isValidHexColor = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Validates opacity value
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {boolean} - Whether opacity is valid
 */
export const isValidOpacity = (opacity) => {
  return typeof opacity === 'number' && opacity >= 0 && opacity <= 1;
};

/**
 * Validates theme object
 * @param {Object} theme - Theme object to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateTheme = (theme) => {
  const errors = [];
  
  // Validate colors
  if (theme.buttonColor && !isValidHexColor(theme.buttonColor)) {
    errors.push('Invalid button color format');
  }
  if (theme.buttonTextColor && !isValidHexColor(theme.buttonTextColor)) {
    errors.push('Invalid button text color format');
  }
  if (theme.habitCardColor && !isValidHexColor(theme.habitCardColor)) {
    errors.push('Invalid habit card color format');
  }
  if (theme.habitCardTextColor && !isValidHexColor(theme.habitCardTextColor)) {
    errors.push('Invalid habit card text color format');
  }
  if (theme.completedCellColor && !isValidHexColor(theme.completedCellColor)) {
    errors.push('Invalid completed cell color format');
  }
  if (theme.uncompletedCellColor && !isValidHexColor(theme.uncompletedCellColor)) {
    errors.push('Invalid uncompleted cell color format');
  }
  if (theme.futureCellColor && !isValidHexColor(theme.futureCellColor)) {
    errors.push('Invalid future cell color format');
  }
  
  // Validate opacity values
  if (theme.buttonOpacity !== undefined && !isValidOpacity(theme.buttonOpacity)) {
    errors.push('Button opacity must be between 0 and 1');
  }
  if (theme.buttonTextOpacity !== undefined && !isValidOpacity(theme.buttonTextOpacity)) {
    errors.push('Button text opacity must be between 0 and 1');
  }
  if (theme.habitCardOpacity !== undefined && !isValidOpacity(theme.habitCardOpacity)) {
    errors.push('Habit card opacity must be between 0 and 1');
  }
  if (theme.habitCardTextOpacity !== undefined && !isValidOpacity(theme.habitCardTextOpacity)) {
    errors.push('Habit card text opacity must be between 0 and 1');
  }
  if (theme.completedCellOpacity !== undefined && !isValidOpacity(theme.completedCellOpacity)) {
    errors.push('Completed cell opacity must be between 0 and 1');
  }
  if (theme.uncompletedCellOpacity !== undefined && !isValidOpacity(theme.uncompletedCellOpacity)) {
    errors.push('Uncompleted cell opacity must be between 0 and 1');
  }
  if (theme.futureCellOpacity !== undefined && !isValidOpacity(theme.futureCellOpacity)) {
    errors.push('Future cell opacity must be between 0 and 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Converts hex color to RGBA with opacity
 * @param {string} hex - Hex color
 * @param {number} opacity - Opacity value
 * @returns {string} - RGBA color string
 */
export const hexToRgba = (hex, opacity = 1) => {
  if (!isValidHexColor(hex)) return hex;
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Generates CSS custom properties from theme
 * @param {Object} theme - Theme configuration
 * @returns {Object} - CSS custom properties object
 */
export const generateThemeStyles = (theme = {}) => {
  const mergedTheme = { ...DEFAULT_THEME, ...theme };
  
  return {
    '--custom-button-color': hexToRgba(mergedTheme.buttonColor, mergedTheme.buttonOpacity),
    '--custom-button-text-color': hexToRgba(mergedTheme.buttonTextColor, mergedTheme.buttonTextOpacity),
    '--custom-habit-card-color': hexToRgba(mergedTheme.habitCardColor, mergedTheme.habitCardOpacity),
    '--custom-habit-card-text-color': hexToRgba(mergedTheme.habitCardTextColor, mergedTheme.habitCardTextOpacity),
    
    // Calendar cell colors
    '--custom-completed-cell-color': hexToRgba(mergedTheme.completedCellColor, mergedTheme.completedCellOpacity),
    '--custom-uncompleted-cell-color': hexToRgba(mergedTheme.uncompletedCellColor, mergedTheme.uncompletedCellOpacity),
    '--custom-future-cell-color': hexToRgba(mergedTheme.futureCellColor, mergedTheme.futureCellOpacity),
    
    // Individual color and opacity values for more complex styling
    '--custom-button-color-solid': mergedTheme.buttonColor,
    '--custom-button-opacity': mergedTheme.buttonOpacity,
    '--custom-button-text-color-solid': mergedTheme.buttonTextColor,
    '--custom-button-text-opacity': mergedTheme.buttonTextOpacity,
    '--custom-habit-card-color-solid': mergedTheme.habitCardColor,
    '--custom-habit-card-opacity': mergedTheme.habitCardOpacity,
    '--custom-habit-card-text-color-solid': mergedTheme.habitCardTextColor,
    '--custom-habit-card-text-opacity': mergedTheme.habitCardTextOpacity,
    '--custom-completed-cell-color-solid': mergedTheme.completedCellColor,
    '--custom-completed-cell-opacity': mergedTheme.completedCellOpacity,
    '--custom-uncompleted-cell-color-solid': mergedTheme.uncompletedCellColor,
    '--custom-uncompleted-cell-opacity': mergedTheme.uncompletedCellOpacity,
    '--custom-future-cell-color-solid': mergedTheme.futureCellColor,
    '--custom-future-cell-opacity': mergedTheme.futureCellOpacity
  };
};

/**
 * Updates user theme in database
 * @param {string} userId - User's ID
 * @param {Object} theme - Theme configuration
 * @returns {Promise<Object>} - Update result
 */
export const updateUserTheme = async (userId, theme) => {
  try {
    // Validate theme
    const validation = validateTheme(theme);
    if (!validation.isValid) {
      throw new Error(`Theme validation failed: ${validation.errors.join(', ')}`);
    }

    // Update user profile with theme data
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        theme_customization: theme,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      theme: data.theme_customization
    };

  } catch (error) {
    console.error('Error updating user theme:', error);
    return {
      success: false,
      error: error.message || 'Failed to update theme'
    };
  }
};

/**
 * Gets user theme from database
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} - Theme data
 */
export const getUserTheme = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('theme_customization')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    return data?.theme_customization || DEFAULT_THEME;

  } catch (error) {
    console.error('Error fetching user theme:', error);
    return DEFAULT_THEME;
  }
};

/**
 * Resets user theme to default
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} - Reset result
 */
export const resetUserTheme = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        theme_customization: DEFAULT_THEME,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      theme: DEFAULT_THEME
    };

  } catch (error) {
    console.error('Error resetting user theme:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset theme'
    };
  }
};

/**
 * Applies theme styles to document root
 * @param {Object} theme - Theme configuration
 */
export const applyThemeToDocument = (theme = {}) => {
  const styles = generateThemeStyles(theme);
  const root = document.documentElement;
  
  Object.entries(styles).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

/**
 * Gets color contrast ratio for accessibility
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} - Contrast ratio
 */
export const getContrastRatio = (color1, color2) => {
  const getLuminance = (hex) => {
    const rgb = hex.replace('#', '').match(/.{2}/g).map(x => {
      const val = parseInt(x, 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Suggests better contrast colors if needed
 * @param {string} backgroundColor - Background color
 * @param {string} textColor - Text color
 * @returns {Object} - Contrast analysis and suggestions
 */
export const analyzeContrast = (backgroundColor, textColor) => {
  const ratio = getContrastRatio(backgroundColor, textColor);
  const isAccessible = ratio >= 4.5; // WCAG AA standard
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    isAccessible,
    suggestion: !isAccessible ? 'Consider using higher contrast colors for better readability' : 'Good contrast ratio'
  };
};
