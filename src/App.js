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
      
      // If we have an access token and we're on signin page, this might be email confirmation
      if (hasAccessToken && window.location.pathname === '/signin') {
        console.log('Email confirmation detected on page load, redirecting...');
        setTimeout(() => {
          window.location.href = '/email-confirmed';
        }, 1000); // Small delay to ensure auth state is processed
      }
    };

    checkEmailConfirmation();
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      console.log('Current URL:', window.location.href);
      console.log('Current pathname:', window.location.pathname);
      console.log('Current hash:', window.location.hash);
      
      setSession(session);
      
      // Handle email confirmation redirect
      if (event === 'SIGNED_IN' && session) {
        // Check if this is an email confirmation by looking for URL hash parameters
        const urlHash = window.location.hash;
        const urlParams = new URLSearchParams(urlHash.substring(1));
        const hasAccessToken = urlParams.get('access_token');
        const signupType = urlParams.get('type');
        
        console.log('URL Hash:', urlHash);
        console.log('Access Token present:', !!hasAccessToken);
        console.log('Signup Type:', signupType);
        console.log('Current path:', window.location.pathname);
        
        // If user just confirmed email (has access token and type), show confirmation page
        if (hasAccessToken && signupType === 'signup' && window.location.pathname === '/signin') {
          console.log('Redirecting to email-confirmed page');
          window.location.href = '/email-confirmed';
        }
        // Otherwise, if user just signed in normally on signin page, redirect to main
        else if (window.location.pathname === '/signin') {
          console.log('Normal signin, redirecting to main page');
          window.location.href = '/';
        }
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
            element={!session ? <SignIn /> : <Navigate to="/" />}
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