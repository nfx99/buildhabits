/**
 * Test utility for profile picture functionality
 * This can be used to test the profile picture system in development
 */

import { validateImageFile, getDefaultAvatarUrl, extractFilePathFromUrl } from './profilePictureUpload';

// Test validation function
export const testValidation = () => {
  console.log('Testing file validation...');
  
  // Test valid file
  const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
  Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
  const validResult = validateImageFile(validFile);
  console.log('Valid file test:', validResult.isValid ? '✅ PASS' : '❌ FAIL');
  
  // Test oversized file
  const oversizedFile = new File([''], 'big.jpg', { type: 'image/jpeg' });
  Object.defineProperty(oversizedFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB
  const oversizedResult = validateImageFile(oversizedFile);
  console.log('Oversized file test:', !oversizedResult.isValid ? '✅ PASS' : '❌ FAIL');
  
  // Test invalid type
  const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
  Object.defineProperty(invalidFile, 'size', { value: 1024 }); // 1KB
  const invalidResult = validateImageFile(invalidFile);
  console.log('Invalid type test:', !invalidResult.isValid ? '✅ PASS' : '❌ FAIL');
};

// Test default avatar generation
export const testDefaultAvatar = () => {
  console.log('Testing default avatar generation...');
  
  const username = 'TestUser123';
  const avatarUrl = getDefaultAvatarUrl(username);
  const isValidUrl = avatarUrl && avatarUrl.startsWith('https://api.dicebear.com');
  console.log('Default avatar test:', isValidUrl ? '✅ PASS' : '❌ FAIL');
  console.log('Generated URL:', avatarUrl);
};

// Test URL path extraction
export const testUrlExtraction = () => {
  console.log('Testing URL path extraction...');
  
  const testUrl = 'https://abc123.supabase.co/storage/v1/object/public/profile-pictures/user123/image.jpg';
  const extractedPath = extractFilePathFromUrl(testUrl);
  const expectedPath = 'user123/image.jpg';
  console.log('URL extraction test:', extractedPath === expectedPath ? '✅ PASS' : '❌ FAIL');
  console.log('Extracted path:', extractedPath);
};

// Run all tests
export const runAllTests = () => {
  console.log('🧪 Running Profile Picture Tests...\n');
  
  testValidation();
  console.log('');
  
  testDefaultAvatar();
  console.log('');
  
  testUrlExtraction();
  console.log('');
  
  console.log('✅ All tests completed!');
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment the line below to run tests on import
  // runAllTests();
}
