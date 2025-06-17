import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import * as Toast from '@radix-ui/react-toast';
import SignIn from './Sign-In/SignIn';
import MainPage from './MainPage/MainPage';
import LandingPage from './LandingPage/LandingPage';
import UserProfile from './UserProfile/UserProfile';
import PaymentSuccess from './PaymentSuccess';
import PaymentCancelled from './PaymentCancelled';
import EmailConfirmation from './EmailConfirmation';
import { supabase } from './config/supabase';

function App() {
  const [session, setSession] = React.useState(null);
  const [isEmailConfirmation, setIsEmailConfirmation] = React.useState(false);

  // Check for email confirmation on page load
  React.useEffect(() => {
    const checkEmailConfirmation = () => {
      const urlHash = window.location.hash;
      const urlParams = new URLSearchParams(urlHash.substring(1));
      const hasAccessToken = urlParams.get('access_token');
      const tokenType = urlParams.get('type');
      
      // If we have an access token and type=signup, this is email confirmation
      if (hasAccessToken && tokenType === 'signup') {
        setIsEmailConfirmation(true);
        if (window.location.pathname !== '/email-confirmed') {
          window.location.href = `/email-confirmed${window.location.hash}`;
        }
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
      setSession(session);
      
      // Handle regular sign in redirect (not email confirmation)
      if (event === 'SIGNED_IN' && session && !isEmailConfirmation) {
        const currentPath = window.location.pathname;
        
        // If user just signed in normally on signin page, redirect to main
        if (currentPath === '/signin') {
          window.location.href = '/';
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    window.location.href = '/signin?signup=true';
  };

  return (
    <Router>
      <Toast.Provider>
        <Routes>
          <Route
            path="/"
            element={
              isEmailConfirmation ? (
                <Navigate to="/email-confirmed" />
              ) : session ? (
                <MainPage session={session} />
              ) : (
                <LandingPage onGetStarted={handleGetStarted} />
              )
            }
          />
          <Route
            path="/signin"
            element={
              isEmailConfirmation ? (
                <Navigate to="/email-confirmed" />
              ) : session ? (
                <Navigate to="/" />
              ) : (
                <SignIn />
              )
            }
          />
          <Route 
            path="/user/:userId" 
            element={<UserProfile session={session} />} 
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