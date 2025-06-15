import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import * as Toast from '@radix-ui/react-toast';
import SignIn from './Sign-In/SignIn';
import MainPage from './MainPage/MainPage';
import LandingPage from './LandingPage/LandingPage';
import PaymentSuccess from './PaymentSuccess';
import PaymentCancelled from './PaymentCancelled';
import EmailConfirmation from './EmailConfirmation';
import { supabase } from './config/supabase';

function App() {
  const [session, setSession] = React.useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState(false);

  // Check for email confirmation on page load
  React.useEffect(() => {
    const checkEmailConfirmation = () => {
      const urlHash = window.location.hash;
      const urlParams = new URLSearchParams(urlHash.substring(1));
      const hasAccessToken = urlParams.get('access_token');
      const tokenType = urlParams.get('type');
      
      console.log('Page load - checking for email confirmation');
      console.log('URL:', window.location.href);
      console.log('Hash:', urlHash);
      console.log('Access token present:', !!hasAccessToken);
      console.log('Token type:', tokenType);
      console.log('Current pathname:', window.location.pathname);
      console.log('Pathname === "/":', window.location.pathname === '/');
      console.log('Pathname === "/signin":', window.location.pathname === '/signin');
      
      // Debug the full condition
      const hasTokens = hasAccessToken && tokenType === 'signup';
      const onCorrectPath = window.location.pathname === '/' || window.location.pathname === '/signin';
      console.log('Has tokens (access_token + type=signup):', hasTokens);
      console.log('On correct path (/ or /signin):', onCorrectPath);
      console.log('Should redirect:', hasTokens && onCorrectPath);
      
      // If we have an access token and type=signup, this is email confirmation
      // Check for both root path "/" and "/signin" since users can land on either
      if (hasAccessToken && tokenType === 'signup' && (window.location.pathname === '/' || window.location.pathname === '/signin')) {
        console.log('Email confirmation detected on page load, redirecting...');
        // Preserve the tokens when redirecting to confirmation page
        window.location.href = `/email-confirmed${window.location.hash}`;
      }
      // If we have recovery tokens on root path, redirect to signin for password reset
      else if (hasAccessToken && tokenType === 'recovery' && window.location.pathname === '/') {
        console.log('🔑 Password recovery detected on root path, redirecting to signin...');
        // Redirect to signin page with recovery tokens and reset parameter
        window.location.href = `/signin?reset=true${window.location.hash}`;
      } 
      else {
        console.log('Redirect conditions not met');
      }
    };

    checkEmailConfirmation();
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
            // Check if initial session is from password recovery
      if (session) {
        const urlHash = window.location.hash;
        const urlParams = new URLSearchParams(urlHash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const tokenType = urlParams.get('type');
        const isPasswordReset = searchParams.get('reset') === 'true';
        const currentPath = window.location.pathname;
        
        // Check for recovery on both root and signin paths
        if ((tokenType === 'recovery' || isPasswordReset) && (currentPath === '/' || currentPath === '/signin')) {
          console.log('🔑 Initial session detected as password recovery');
          console.log('🔍 Token type:', tokenType);
          console.log('🔍 Password reset param:', isPasswordReset);
          console.log('🔍 Current path:', currentPath);
          setIsPasswordRecovery(true);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      console.log('Current URL:', window.location.href);
      console.log('Current pathname:', window.location.pathname);
      console.log('Current hash:', window.location.hash);
      console.log('🔍 isPasswordRecovery before processing:', isPasswordRecovery);
      
      setSession(session);
      
      // First, check if we need to set password recovery flag based on URL
      const urlHash = window.location.hash;
      const urlParams = new URLSearchParams(urlHash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      const hasAccessToken = urlParams.get('access_token');
      const tokenType = urlParams.get('type');
      const isPasswordReset = searchParams.get('reset') === 'true';
      const currentPath = window.location.pathname;
      
      // Set password recovery flag if we detect recovery tokens and haven't set it yet
      if (!isPasswordRecovery && ((hasAccessToken && tokenType === 'recovery') || isPasswordReset) && currentPath === '/signin') {
        console.log('🔑 Setting password recovery flag from auth state change');
        setIsPasswordRecovery(true);
      }

              // Handle email confirmation redirect
        if (event === 'SIGNED_IN' && session) {
          console.log('URL Hash:', urlHash);
          console.log('Access Token present:', !!hasAccessToken);
          console.log('Token Type:', tokenType);
          console.log('Is Password Reset:', isPasswordReset);
          console.log('Current path:', currentPath);
          console.log('🔍 isPasswordRecovery state:', isPasswordRecovery);
          
          // If user just confirmed email (has access token and type=signup), show confirmation page
          if (hasAccessToken && tokenType === 'signup' && currentPath === '/signin') {
            console.log('Redirecting to email-confirmed page');
            window.location.href = '/email-confirmed';
          }
          // If this is a password recovery (any detection method), stay on signin page
          else if (((hasAccessToken && tokenType === 'recovery') || isPasswordReset || isPasswordRecovery) && currentPath === '/signin') {
            console.log('🔑 Password recovery detected, staying on signin page');
            // Don't redirect - let the SignIn component handle the password reset flow
          }
          // Otherwise, if user just signed in normally on signin page, redirect to main
          else if (currentPath === '/signin') {
            console.log('Normal signin, redirecting to main page');
            window.location.href = '/';
          }
        }
      
      // Reset password recovery flag when user signs out
      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    window.location.href = '/signin';
  };

  return (
    <Router>
      <Toast.Provider>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <MainPage session={session} />
              ) : (
                <LandingPage onGetStarted={handleGetStarted} />
              )
            }
          />
          <Route
            path="/signin"
            element={(() => {
              // Allow access to signin page if no session
              if (!session) return <SignIn />;
              
              // Allow access to signin page if user is in password recovery mode
              if (isPasswordRecovery) {
                return <SignIn isPasswordRecovery={true} />;
              }
              
              // Otherwise redirect to main page
              return <Navigate to="/" />;
            })()}
          />
          <Route path="/email-confirmed" element={<EmailConfirmation />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        </Routes>
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </Router>
  );
}

export default App; 