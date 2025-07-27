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

const createUserProfile = async (userId) => {
  // First, check if there's already a profile for this user_id (from a previous account)
  try {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      // Profile already exists (maybe from a deleted account that wasn't fully cleaned up)
      // Update it instead of creating a new one
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          username: existingProfile.username, // Keep existing username
          is_premium: false,
          deleted_at: null // Clear deletion marker if it exists
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return data;
    }
  } catch (error) {
    // If no existing profile found (PGRST116), continue with creating new one
    if (error.code !== 'PGRST116') {
      throw error;
    }
  }

  // Generate a unique username for new profile
  let username = generateUsername();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (!existingUser) {
        // Username is available, create the profile
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

        if (error) {
          throw error;
        }
        
        return data;
      } else {
        // Username taken, generate a new one
        username = generateUsername();
        attempts++;
      }
    } catch (error) {
      // If it's a "not found" error, the username is available
      if (error.code === 'PGRST116') {
        try {
          const { data, error: insertError } = await supabase
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

          if (insertError) {
            throw insertError;
          }
          
          return data;
        } catch (insertError) {
          if (insertError.code === '23505') {
            // Unique constraint violation, try again with new username
            username = generateUsername();
            attempts++;
            continue;
          }
          throw insertError;
        }
      } else {
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
  // Check URL parameter to determine if should start in signup mode
  const [isSignUp, setIsSignUp] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('signup') === 'true';
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Check if account was just deleted
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('account_deleted') === 'true') {
      setToastMessage('✅ Account successfully deleted. You can create a new account if you wish.');
      setShowToast(true);
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.REACT_APP_BASE_URL || window.location.origin}/signin`
          }
        });

        if (error) {
          if (
            error.status === 422
          ) {
            setToastMessage('This email is already registered. Please sign in instead.');
            setShowToast(true);
            setTimeout(() => {
              setIsSignUp(false);
            }, 1500);
            return;
          } else {
            throw error;
          }
        }
        
        // Analyze the signup response to determine if this is truly new or existing
        if (data?.user) {
          // If email is already confirmed, this is an existing verified user
          if (data.user.role !== 'authenticated') {
            setToastMessage('This email is already registered. Please sign in instead');
            setShowToast(true);
            setTimeout(() => {
              setIsSignUp(false);
            }, 1500); 
            return;
          }
          // This appears to be a genuine new signup
          try {
            await createUserProfile(data.user.id);
          } catch (profileError) {
            // Profile creation can fail for existing users, that's OK
            console.warn('Profile creation failed:', profileError);
          }
          setToastMessage('Check your email for the confirmation link');
          setShowToast(true);
        } else {
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