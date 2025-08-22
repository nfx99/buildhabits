import React, { useState, useRef } from 'react';
import { uploadProfilePicture, updateUserProfilePicture, validateImageFile, extractFilePathFromUrl } from '../utils/profilePictureUpload';
import './ProfilePictureUpload.css';

const ProfilePictureUpload = ({ 
  userId, 
  currentImageUrl, 
  username,
  onUploadSuccess, 
  onUploadError,
  disabled = false 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file || disabled) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      onUploadError?.(validation.error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload the image
      const uploadResult = await uploadProfilePicture(userId, file, (progress) => {
        setUploadProgress(progress);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Update user profile with new image URL
      const oldFilePath = extractFilePathFromUrl(currentImageUrl);
      const updateResult = await updateUserProfilePicture(
        userId, 
        uploadResult.url, 
        oldFilePath
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      // Notify parent component of success
      onUploadSuccess?.(uploadResult.url, updateResult.profile);

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const getDisplayImage = () => {
    if (currentImageUrl) {
      return currentImageUrl;
    }
    
    return null; // Return null to show initials instead of generated avatar
  };

  const getUserInitials = () => {
    if (!username) return '👤';
    return username[0]?.toUpperCase() || '👤';
  };

  return (
    <div className="profile-picture-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
      
      <div
        className={`image-container ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={disabled ? '' : (isUploading ? 'Uploading profile picture...' : 'Click to change profile picture')}
        title={disabled ? '' : (isUploading ? 'Uploading...' : 'Click to change profile picture')}
      >
        {getDisplayImage() ? (
          <img
            src={getDisplayImage()}
            alt={`${username}'s profile`}
            className="profile-image"
          />
        ) : (
          <div className="default-avatar">
            {getUserInitials()}
          </div>
        )}
        
        {/* Upload overlay - only shows on hover */}
        {!disabled && (
          <div className="upload-overlay">
            {isUploading ? (
              <div className="upload-progress">
                <div className="spinner"></div>
                <span className="upload-text">Uploading...</span>
                {uploadProgress > 0 && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="upload-prompt">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="upload-text">Change</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
