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
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (!existingUser) {
        // Username is unique, create the profile
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
        
        if (error) throw error;
        
        console.log('User profile created with username:', username);
        return data;
      }
      
      attempts++;
    } catch (error) {
      console.error('Error creating user profile:', error);
      attempts++;
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
        // Try to sign up - this will fail if the email exists
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.REACT_APP_BASE_URL || window.location.origin}/signin`
          }
        });

        if (error) {
          // Check for various duplicate email error messages
          if (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already exists') ||
            error.message.toLowerCase().includes('already in use') ||
            error.message.toLowerCase().includes('email taken')
          ) {
            setToastMessage('This email is already registered. Please sign in instead.');
            setShowToast(true);
            setTimeout(() => {
              setIsSignUp(false);
            }, 1500);
          } else {
            throw error;
          }
        } else if (data?.user) {
          // Create user profile with username if user was created successfully
          try {
            await createUserProfile(data.user.id);
          } catch (profileError) {
            console.error('Error creating user profile:', profileError);
            // Don't throw error here - signup was successful even if profile creation failed
          }
          
          setToastMessage('Check your email for the confirmation link!');
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