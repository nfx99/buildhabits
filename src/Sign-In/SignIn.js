import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import * as Toast from '@radix-ui/react-toast';
import './SignIn.css';

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
          // If the error indicates the user exists, switch to sign in
          if (error.message.toLowerCase().includes('already registered')) {
            setToastMessage('Email already registered. Switching to sign in...');
            setShowToast(true);
            setTimeout(() => {
              setIsSignUp(false);
            }, 1500);
          } else {
            throw error;
          }
        } else if (data?.user) {
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