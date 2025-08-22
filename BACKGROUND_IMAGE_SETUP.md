# 🎨 Background Image Setup Guide

This guide will help you set up the custom background image functionality for your BuildHabits app.

## 🎯 Overview

Users can now upload and set custom background images that will be applied to the entire site. This feature includes:
- **Background image upload** with drag-and-drop interface
- **Image optimization** (resizes to 1920x1080px max, converts to JPEG)
- **Storage management** (automatic cleanup of old backgrounds)
- **Remove background** option to restore default gradient
- **Responsive design** that works on all devices

## 📊 Database Schema Update

You need to add a `background_image_url` column to your `user_profiles` table:

### SQL Command:
```sql
ALTER TABLE user_profiles 
ADD COLUMN background_image_url TEXT;
```

### Or in Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** > `user_profiles`
3. Click **Add Column**
4. Column name: `background_image_url`
5. Data type: `text`
6. Default value: (leave empty)
7. Allow nullable: ✅ Yes
8. Click **Save**

## 🗄️ Storage Bucket Setup

Create a storage bucket for background images:

### Option 1: Supabase Dashboard (Recommended)
1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Bucket name: `background-images`
4. Set as **Public bucket**: ✅ Yes
5. Click **Create bucket**

### Option 2: SQL (Alternative)
```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('background-images', 'background-images', true);
```

## 🔐 Security Policies

Set up Row Level Security (RLS) policies for the background images bucket:

```sql
-- Allow public viewing of background images
CREATE POLICY "Anyone can view background images" ON storage.objects
FOR SELECT USING (bucket_id = 'background-images');

-- Allow users to upload their own background images
CREATE POLICY "Users can upload their own background images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'background-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own background images
CREATE POLICY "Users can update their own background images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'background-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own background images
CREATE POLICY "Users can delete their own background images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'background-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## ✨ Features Implemented

### 🎨 **Background Image Upload Component** (`src/components/BackgroundImageUpload.js`)
- **Drag-and-drop interface** for easy uploading
- **Click to browse** file selection
- **Real-time progress indicator** during upload
- **File validation** (size, type, dimensions)
- **Preview thumbnail** of current background
- **Remove background** button

### 🖼️ **Image Optimization** 
- **Automatic resizing** to max 1920x1080px
- **JPEG compression** at 85% quality
- **File size limit** of 10MB (larger than profile pictures)
- **Format conversion** to JPEG for consistency

### 🎯 **Background Application**
- **Real-time background changes** across the entire site
- **Fixed attachment** for parallax effect
- **Cover sizing** for proper scaling
- **Center positioning** for optimal display
- **Fallback gradient** when no background is set

### 🔧 **Storage Management**
- **Automatic cleanup** of old background images
- **User-specific folders** in storage
- **Efficient file organization**
- **Secure access policies**

## 🚀 How Users Can Set Background Images

### **From Profile Dialog:**
1. Click profile avatar in top-right corner
2. Scroll down to "Background Image" section
3. **Upload**: Click or drag image to upload area
4. **Remove**: Click "Remove Background" button to restore default
5. Get instant feedback with success/error messages

### **Supported Files:**
- **Formats**: JPEG, PNG, WebP
- **Max size**: 10MB
- **Recommended**: 1920x1080px or similar aspect ratio
- **Auto-optimization**: Images resized and compressed automatically

## 🎨 Default Behavior

When no background image is set:
- **Original app background**: Clean white background with subtle pattern
- **Consistent experience**: Maintains the existing BuildHabits design
- **Professional appearance**: Clean, minimalist aesthetic

## 📱 Mobile Experience

- **Responsive design**: Upload interface adapts to screen size
- **Touch-friendly**: Large tap targets and intuitive gestures
- **Mobile upload**: Works with camera or photo library
- **Performance optimized**: Background images scale appropriately

## 🔍 Technical Details

### **Files Created:**
- ✨ `src/utils/backgroundImageUpload.js` - Core upload/management utilities
- ✨ `src/components/BackgroundImageUpload.js` - Upload component
- ✨ `src/components/BackgroundImageUpload.css` - Beautiful styling
- 🔄 `src/MainPage/MainPage.js` - Updated with background functionality

### **Database Impact:**
- **Storage**: Images stored in Supabase Storage (not database)
- **Database size**: Only URLs stored (~100 bytes per user)
- **Performance**: No impact on query performance
- **Backup**: Images backed up separately from database

### **Integration:**
- **Background styles**: Applied to main page container
- **Real-time updates**: Changes apply immediately
- **Profile dialog**: Settings accessible from user profile
- **State management**: Background URL synced across app

## 🎉 You're All Set!

Once you complete the database and storage setup steps above, users can upload and enjoy custom background images! The system handles all the complexity of optimization, storage, and display automatically.

### **Benefits:**
- **Personalization**: Users can customize their experience
- **Performance**: Optimized images load quickly
- **Storage efficiency**: Smart compression and cleanup
- **User experience**: Intuitive upload interface
- **Mobile-friendly**: Works perfectly on all devices

The background image feature adds a beautiful personalization option while maintaining excellent performance and user experience! 🎨✨
