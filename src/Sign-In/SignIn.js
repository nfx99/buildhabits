import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import * as Toast from '@radix-ui/react-toast';
import './SignIn.css';



// Function to generate a random username
const generateUsername = () => {
  const adjectives = [
    'Bold', 'Bright', 'Calm', 'Clever', 'Cool', 'Creative', 'Daring', 'Dynamic',
    'Epic', 'Focused', 'Gentle', 'Happy', 'Inspired', 'Joyful', 'Kind', 'Lively',
    'Mindful', 'Natural', 'Optimistic', 'Peaceful', 'Quick', 'Radiant', 'Strong',
    'Thoughtful', 'Unique', 'Vibrant', 'Wise', 'Zen'
  ];
  
  const nouns = [
    'Achiever', 'Builder', 'Creator', 'Dreamer', 'Explorer', 'Finisher', 'Grower',
    'Helper', 'Innovator', 'Journeyer', 'Keeper', 'Learner', 'Maker', 'Navigator',
    'Organizer', 'Pioneer', 'Questioner', 'Runner', 'Seeker', 'Tracker', 'Uniter',
    'Visionary', 'Walker', 'Xplorer', 'Yearner', 'Zoner'
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}${noun}${number}`;
};

// Function to create user profile with username
const createUserProfile = async (userId) => {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const username = generateUsername();
    
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      // Debug: Log the full error structure to understand what we're getting
      if (checkError) {
        console.log('Username check error details:', {
          message: checkError.message,
          status: checkError.status,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint,
          fullError: checkError
        });
      }
      
      // If we get a 406 error during the username check, it means access is not allowed (email likely already registered)
      if (checkError && (checkError.status === 406 || checkError.code === 406 || 
          (checkError.message && checkError.message.includes('406')))) {
        console.log('406 error detected during username check - email likely already registered');
        const error406 = new Error('Profile already exists - email already registered');
        error406.status = 406;
        error406.code = 406;
        throw error406;
      }
      
      // If we get a 401 error, it also likely means the user/email already exists
      if (checkError && (checkError.status === 401 || checkError.code === 401 ||
          (checkError.message && checkError.message.includes('401')))) {
        console.log('401 error detected during username check - email likely already registered');
        const error401 = new Error('Profile already exists - unauthorized access');
        error401.status = 406; // Treat as 406 for consistency
        error401.code = 406;
        throw error401;
      }
      
      if (!existingUser || checkError?.details?.includes('0 rows')) {
        // Username is unique (or we got an error indicating no rows), try to create the profile
        const { data, error } = await supabase
          .from('user_profiles')
          .insert([
            {
              user_id: userId,
              username: username,
              is_premium: false
            }
          ])
          .select()
          .single();
        
        // If we get a 406 error during profile creation
        if (error && (error.status === 406 || error.code === 406)) {
          console.log('406 error detected during profile creation');
          const error406 = new Error('Profile already exists - email already registered');
          error406.status = 406;
          error406.code = 406;
          throw error406;
        }
        
        // If we get a 401 error during profile creation
        if (error && (error.status === 401 || error.code === 401)) {
          console.log('401 error detected during profile creation');
          const error401 = new Error('Profile already exists - unauthorized');
          error401.status = 406; // Treat as 406 for consistency
          error401.code = 406;
          throw error401;
        }
        
        if (error) throw error;
        
        console.log('User profile created with username:', username);
        return data;
      }
      
      attempts++;
    } catch (error) {
      console.log('Error in createUserProfile:', error);
      
      // If it's a 406 error or we marked it as 406, don't retry - immediately throw it up
      if (error.status === 406 || error.code === 406) {
        console.log('Breaking out of loop due to 406 error');
        throw error;
      }
      
      console.error('Error creating user profile (will retry):', error);
      attempts++;
      
      // If we've exhausted attempts, throw the last error
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }
  
  throw new Error('Could not generate unique username after multiple attempts');
};

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Try to sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.REACT_APP_BASE_URL || window.location.origin}/signin`
          }
        });

        if (error) {
          // Log the exact error message for debugging
          console.log('Supabase auth error:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
          
          // Check for various duplicate email error messages
          const errorMsg = error.message.toLowerCase();
          if (
            errorMsg.includes('already registered') ||
            errorMsg.includes('already exists') ||
            errorMsg.includes('already in use') ||
            errorMsg.includes('email taken') ||
            errorMsg.includes('user already registered') ||
            errorMsg.includes('duplicate') ||
            errorMsg.includes('email address is already') ||
            error.status === 422 // Unprocessable Entity - often used for duplicate emails
          ) {
            setToastMessage('This email is already registered. Please sign in instead.');
            setShowToast(true);
            setTimeout(() => {
              setIsSignUp(false);
            }, 1500);
            return; // Exit early to prevent further processing
          } else {
            throw error;
          }
        } 
        
        // If signup succeeded, check if we actually got a user
        if (data?.user) {
          // For existing users, Supabase might return a user object but not create a new account
          // Check if this is a case where the user already exists but wasn't flagged as an error
          if (data.user && !data.user.email_confirmed_at && data.user.created_at) {
            // Check if created_at is recent (within last few seconds) to determine if this is a new user
            const createdAt = new Date(data.user.created_at);
            const now = new Date();
            const diffInSeconds = (now - createdAt) / 1000;
            
            // If the user was created more than 10 seconds ago, it's likely an existing user
            if (diffInSeconds > 10) {
              setToastMessage('This email is already registered. Please sign in instead.');
              setShowToast(true);
              setTimeout(() => {
                setIsSignUp(false);
              }, 1500);
              return;
            }
          }

          // Create user profile with username if user was created successfully
          try {
            await createUserProfile(data.user.id);
            // Only show success message if profile creation actually succeeded
            setToastMessage('Check your email for the confirmation link!');
            setShowToast(true);
          } catch (profileError) {
            console.error('Error creating user profile:', profileError);
            
            // Check specifically for 406 status code (Not Acceptable) or 401 (Unauthorized)
            if (profileError.status === 406 || profileError.code === 406 || 
                profileError.status === 401 || profileError.code === 401) {
              console.log('Detected 406/401 error - email already registered');
              setToastMessage('This email is already registered. Please sign in instead.');
              setShowToast(true);
              setTimeout(() => {
                setIsSignUp(false);
              }, 1500);
              return; // Stop further processing - do NOT show success message
            }
            
            // Check for various error conditions that indicate the user already exists
            if (
              (profileError.code === '42501' && profileError.message.includes('row-level security policy')) ||
              (profileError.code === '23505') || // Unique constraint violation
              profileError.message.toLowerCase().includes('already exists') ||
              profileError.message.toLowerCase().includes('duplicate')
            ) {
              setToastMessage('This email is already registered. Please sign in instead.');
              setShowToast(true);
              setTimeout(() => {
                setIsSignUp(false);
              }, 1500);
              return; // Stop further processing - do NOT show success message
            }
            
            // For other profile creation errors, show an error message instead of success
            setToastMessage('An error occurred while creating your profile. Please try again.');
            setShowToast(true);
          }
        } else {
          // If no user and no error, something unexpected happened
          setToastMessage('An unexpected error occurred. Please try again.');
          setShowToast(true);
        }
      } else {
        // Regular sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setToastMessage(error.message);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-box">
        <button className="back-button" onClick={handleBackToHome}>
          ← Go Back
        </button>
        <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <p>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            className="toggle-auth"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>

      <Toast.Root
        className="toast-root"
        open={showToast}
        onOpenChange={setShowToast}
        duration={3000}
      >
        <Toast.Title className="toast-title">Notification</Toast.Title>
        <Toast.Description className="toast-description">
          {toastMessage}
        </Toast.Description>
        <Toast.Close className="toast-action" aria-label="Close">
          <span aria-hidden>×</span>
        </Toast.Close>
      </Toast.Root>
    </div>
  );
};

export default SignIn; 