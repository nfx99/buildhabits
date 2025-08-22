import React, { useState, useRef } from 'react';
import { 
  uploadBackgroundImage, 
  updateUserBackgroundImage, 
  validateBackgroundImageFile, 
  extractBackgroundFilePathFromUrl,
  removeUserBackgroundImage 
} from '../utils/backgroundImageUpload';
import './BackgroundImageUpload.css';

const BackgroundImageUpload = ({ 
  userId, 
  currentImageUrl, 
  onUploadSuccess, 
  onUploadError,
  onRemoveSuccess,
  disabled = false 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file || disabled) return;

    // Validate file
    const validation = validateBackgroundImageFile(file);
    if (!validation.isValid) {
      onUploadError?.(validation.error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload the image
      const uploadResult = await uploadBackgroundImage(userId, file, (progress) => {
        setUploadProgress(progress);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Update user profile with new background image URL
      const oldFilePath = extractBackgroundFilePathFromUrl(currentImageUrl);
      const updateResult = await updateUserBackgroundImage(
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
      console.error('Background upload error:', error);
      onUploadError?.(error.message || 'Failed to upload background image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveBackground = async () => {
    if (disabled || isUploading) return;

    setIsUploading(true);

    try {
      const oldFilePath = extractBackgroundFilePathFromUrl(currentImageUrl);
      const removeResult = await removeUserBackgroundImage(userId, oldFilePath);

      if (!removeResult.success) {
        throw new Error(removeResult.error);
      }

      // Notify parent component of successful removal
      onRemoveSuccess?.(removeResult.profile);

    } catch (error) {
      console.error('Background removal error:', error);
      onUploadError?.(error.message || 'Failed to remove background image');
    } finally {
      setIsUploading(false);
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

  return (
    <div className="background-image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
      
      <div className="background-upload-section">
        <h4>Background Image</h4>
        <p className="background-description">
          Upload a custom background image to personalize your experience
        </p>
        
        <div
          className={`background-upload-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {currentImageUrl ? (
            <div className="background-preview">
              <img
                src={currentImageUrl}
                alt="Current background"
                className="background-thumbnail"
              />
              <div className="background-overlay">
                {isUploading ? (
                  <div className="upload-progress">
                    <div className="spinner"></div>
                    <span>Uploading...</span>
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
                  <div className="background-actions">
                    <span className="change-text">Click to change</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="background-upload-prompt">
              {isUploading ? (
                <div className="upload-progress">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
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
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h5>Upload Background Image</h5>
                  <p>Click or drag image here</p>
                  <span className="file-requirements">
                    PNG, JPG, WebP up to 10MB • 1920x1080px recommended
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {currentImageUrl && !isUploading && (
          <div className="background-actions-footer">
            <button
              className="remove-background-btn"
              onClick={handleRemoveBackground}
              disabled={disabled}
            >
              Restore Default Background
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackgroundImageUpload;
