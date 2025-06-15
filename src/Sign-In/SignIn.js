import React, { useState, useEffect } from 'react';
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
        
        // If there's ANY error during username check, it likely means we can't access the table
        // This usually indicates the email is already registered and RLS is blocking access
        console.log('Username check failed - email likely already registered');
        const emailExistsError = new Error('Profile already exists - email already registered');
        emailExistsError.status = 406;
        emailExistsError.code = 406;
        throw emailExistsError;
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
        
        // If we get any error during profile creation that indicates the user already exists
        if (error && (
          error.status === 406 || error.code === 406 ||
          error.status === 401 || error.code === 401 ||
          error.code === '42501' || // Row-level security policy violation
          (error.message && error.message.includes('row-level security policy'))
        )) {
          console.log('Profile creation failed - user/email already exists:', error.code, error.message);
          const userExistsError = new Error('Profile already exists - email already registered');
          userExistsError.status = 406;
          userExistsError.code = 406;
          throw userExistsError;
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

const SignIn = ({ isPasswordRecovery: isPasswordRecoveryProp = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Check if user is coming from password reset email
  useEffect(() => {
    const checkPasswordReset = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isReset = urlParams.get('reset') === 'true';
      const urlHash = window.location.hash;
      const hashParams = new URLSearchParams(urlHash.substring(1));
      const hasAccessToken = hashParams.get('access_token');
      const tokenType = hashParams.get('type');
      
      console.log('SignIn useEffect - Password reset detection:');
      console.log('URL search params:', window.location.search);
      console.log('URL hash:', urlHash);
      console.log('isReset:', isReset);
      console.log('hasAccessToken:', !!hasAccessToken);
      console.log('tokenType:', tokenType);
      
      // Check for password recovery mode
      if ((isReset && hasAccessToken && tokenType === 'recovery') || 
          (hasAccessToken && tokenType === 'recovery')) {
        console.log('Password recovery mode detected');
        setIsPasswordReset(true);
        setToastMessage('Please enter your new password');
        setShowToast(true);
        return true;
      }
      return false;
    };

    // Check immediately
    const foundReset = checkPasswordReset();
    
    // If passed as prop from App.js, override local detection
    if (isPasswordRecoveryProp && !foundReset) {
      console.log('Password recovery detected from App.js prop');
      setIsPasswordReset(true);
      setToastMessage('Please enter your new password');
      setShowToast(true);
    }
    
    // Also listen for auth state changes in case tokens are processed after component mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change in SignIn:', event, !!session);
      
      if (event === 'SIGNED_IN' && session && !foundReset && !isPasswordRecoveryProp) {
        // Check if this is a password recovery sign-in
        const urlHash = window.location.hash;
        const hashParams = new URLSearchParams(urlHash.substring(1));
        const tokenType = hashParams.get('type');
        const isResetParam = new URLSearchParams(window.location.search).get('reset') === 'true';
        
        console.log('Checking auth state change for password recovery:', tokenType, isResetParam);
        
        if (tokenType === 'recovery' || isResetParam) {
          console.log('Password recovery detected via auth state change');
          setIsPasswordReset(true);
          setToastMessage('Please enter your new password');
          setShowToast(true);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setToastMessage('Please enter your email address');
      setShowToast(true);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.REACT_APP_BASE_URL || window.location.origin}/signin?reset=true`
      });

      if (error) throw error;

      setToastMessage('Password reset email sent! Check your inbox.');
      setShowToast(true);
      
      // Switch back to sign in mode after successful reset email
      setTimeout(() => {
        setIsForgotPassword(false);
      }, 2000);
      
    } catch (error) {
      setToastMessage(error.message);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setToastMessage('Please fill in both password fields');
      setShowToast(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setToastMessage('Passwords do not match');
      setShowToast(true);
      return;
    }

    if (newPassword.length < 6) {
      setToastMessage('Password must be at least 6 characters long');
      setShowToast(true);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setToastMessage('Password updated successfully! You are now signed in.');
      setShowToast(true);
      
      // Clear the URL parameters and redirect to main page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      setToastMessage(error.message);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    // If in forgot password or password reset mode, go back to sign in
    if (isForgotPassword || isPasswordReset) {
      setIsForgotPassword(false);
      setIsPasswordReset(false);
      setIsSignUp(false);
    } else {
      // Otherwise, go back to landing page
      window.location.href = '/';
    }
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-box">
        <button className="back-button" onClick={handleBackToHome}>
          ← Go Back
        </button>
        

        
        <h2>
          {isPasswordReset 
            ? 'Set New Password'
            : isForgotPassword 
            ? 'Reset Password' 
            : isSignUp 
            ? 'Create Account' 
            : 'Sign In'}
        </h2>
        
        {isPasswordReset ? (
          <form onSubmit={handlePasswordReset}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter your new password"
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your new password"
                minLength="6"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>
        ) : (
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
        )}
        {isPasswordReset ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            Enter your new password above to complete the reset process.
          </p>
        ) : isForgotPassword ? (
          <p>
            Remember your password?{' '}
            <button
              className="toggle-auth"
              onClick={() => {
                setIsForgotPassword(false);
                setIsSignUp(false);
              }}
            >
              Sign In
            </button>
          </p>
        ) : (
          <>
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                className="toggle-auth"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
            {!isSignUp && (
              <p>
                <button
                  className="forgot-password-link"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Forgot your password?
                </button>
              </p>
            )}
          </>
        )}
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