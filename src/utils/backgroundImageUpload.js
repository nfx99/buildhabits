/**
 * Background Image Upload Utilities
 * Handles background image upload, optimization, and storage management
 */

import { supabase } from '../config/supabase';

// Configuration constants
const BUCKET_NAME = 'background-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (larger for backgrounds)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_WIDTH = 1920; // Max width for background images
const MAX_HEIGHT = 1080; // Max height for background images

/**
 * Resizes a background image to optimize for web display
 * @param {File} file - The image file to resize
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<Blob>} - Resized image as blob
 */
export const resizeBackgroundImage = (file, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      // Scale down if image is larger than max dimensions
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio, 1); // Don't scale up
      
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      // Set canvas dimensions and draw resized image
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        0.85 // Quality setting
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validates a background image file
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateBackgroundImageFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Invalid file type. Please use JPEG, PNG, or WebP images' 
    };
  }

  return { isValid: true };
};

/**
 * Uploads a background image to Supabase Storage
 * @param {string} userId - The user's ID
 * @param {File} file - The image file to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Upload result with URL and file path
 */
export const uploadBackgroundImage = async (userId, file, onProgress = null) => {
  try {
    // Validate file
    const validation = validateBackgroundImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Resize image to optimize size
    const resizedBlob = await resizeBackgroundImage(file);
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${timestamp}.jpg`; // Always use jpg after compression
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, resizedBlob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded background image');
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      fileName
    };

  } catch (error) {
    console.error('Background image upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload background image'
    };
  }
};

/**
 * Deletes a background image from Supabase Storage
 * @param {string} filePath - The path to the file in storage
 * @returns {Promise<boolean>} - Success status
 */
export const deleteBackgroundImage = async (filePath) => {
  try {
    if (!filePath) return true;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting background image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Background image deletion error:', error);
    return false;
  }
};

/**
 * Updates user profile with new background image URL
 * @param {string} userId - The user's ID
 * @param {string} backgroundImageUrl - The new background image URL
 * @param {string} oldFilePath - Optional old file path to delete
 * @returns {Promise<Object>} - Update result
 */
export const updateUserBackgroundImage = async (userId, backgroundImageUrl, oldFilePath = null) => {
  try {
    // Delete old background image if exists
    if (oldFilePath) {
      await deleteBackgroundImage(oldFilePath);
    }

    // Update user profile in database
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        background_image_url: backgroundImageUrl,
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
      profile: data
    };

  } catch (error) {
    console.error('Error updating user background image:', error);
    return {
      success: false,
      error: error.message || 'Failed to update background image'
    };
  }
};

/**
 * Removes background image (sets to null)
 * @param {string} userId - The user's ID
 * @param {string} oldFilePath - File path to delete from storage
 * @returns {Promise<Object>} - Update result
 */
export const removeUserBackgroundImage = async (userId, oldFilePath = null) => {
  try {
    // Delete old background image if exists
    if (oldFilePath) {
      await deleteBackgroundImage(oldFilePath);
    }

    // Update user profile in database to remove background
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        background_image_url: null,
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
      profile: data
    };

  } catch (error) {
    console.error('Error removing user background image:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove background image'
    };
  }
};

/**
 * Extracts file path from Supabase Storage URL
 * @param {string} url - The storage URL
 * @returns {string|null} - The file path or null if invalid
 */
export const extractBackgroundFilePathFromUrl = (url) => {
  if (!url || !url.includes('supabase')) return null;
  
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME);
    
    if (bucketIndex === -1) return null;
    
    return urlParts.slice(bucketIndex + 1).join('/');
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

/**
 * Gets default background styles (original app background)
 * @returns {Object} - CSS styles for default background
 */
export const getDefaultBackgroundStyles = () => {
  return {
    background: 'transparent' // Let the original app background show through
  };
};

/**
 * Gets background styles for a given image URL
 * @param {string} imageUrl - The background image URL
 * @returns {Object} - CSS styles for background image
 */
export const getBackgroundImageStyles = (imageUrl) => {
  if (!imageUrl) {
    return getDefaultBackgroundStyles();
  }

  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundAttachment: 'fixed',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };
};
