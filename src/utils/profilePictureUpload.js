/**
 * Profile Picture Upload Utilities
 * Handles image upload, optimization, and storage management
 */

import { supabase } from '../config/supabase';

// Configuration constants
const BUCKET_NAME = 'profile-pictures';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 400; // Max width/height in pixels

/**
 * Resizes an image file to optimize for profile pictures
 * @param {File} file - The image file to resize
 * @param {number} maxSize - Maximum dimension (width or height)
 * @returns {Promise<Blob>} - Resized image as blob
 */
export const resizeImage = (file, maxSize = MAX_DIMENSION) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

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
 * Validates an image file for profile picture upload
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateImageFile = (file) => {
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
 * Uploads a profile picture to Supabase Storage
 * @param {string} userId - The user's ID
 * @param {File} file - The image file to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Upload result with URL and file path
 */
export const uploadProfilePicture = async (userId, file, onProgress = null) => {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Resize image to optimize size
    const resizedBlob = await resizeImage(file);
    
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
      throw new Error('Failed to get public URL for uploaded image');
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      fileName
    };

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload profile picture'
    };
  }
};

/**
 * Deletes a profile picture from Supabase Storage
 * @param {string} filePath - The path to the file in storage
 * @returns {Promise<boolean>} - Success status
 */
export const deleteProfilePicture = async (filePath) => {
  try {
    if (!filePath) return true;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting profile picture:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Profile picture deletion error:', error);
    return false;
  }
};

/**
 * Updates user profile with new profile picture URL
 * @param {string} userId - The user's ID
 * @param {string} profilePictureUrl - The new profile picture URL
 * @param {string} oldFilePath - Optional old file path to delete
 * @returns {Promise<Object>} - Update result
 */
export const updateUserProfilePicture = async (userId, profilePictureUrl, oldFilePath = null) => {
  try {
    // Delete old profile picture if exists
    if (oldFilePath) {
      await deleteProfilePicture(oldFilePath);
    }

    // Update user profile in database
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        profile_picture_url: profilePictureUrl,
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
    console.error('Error updating user profile picture:', error);
    return {
      success: false,
      error: error.message || 'Failed to update profile picture'
    };
  }
};

/**
 * Gets the default avatar URL based on username
 * @param {string} username - The user's username
 * @returns {string} - Default avatar URL
 */
export const getDefaultAvatarUrl = (username) => {
  if (!username) return null;
  
  // Use DiceBear API for consistent, nice-looking default avatars
  const seed = encodeURIComponent(username);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=random`;
};

/**
 * Extracts file path from Supabase Storage URL
 * @param {string} url - The storage URL
 * @returns {string|null} - The file path or null if invalid
 */
export const extractFilePathFromUrl = (url) => {
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
