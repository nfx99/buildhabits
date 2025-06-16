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
      
      // If we have an access token and type=signup, this is email confirmation
      if (hasAccessToken && tokenType === 'signup' && (window.location.pathname === '/' || window.location.pathname === '/signin')) {
        window.location.href = `/email-confirmed${window.location.hash}`;
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
      
      // Handle email confirmation redirect
      if (event === 'SIGNED_IN' && session) {
        const urlHash = window.location.hash;
        const urlParams = new URLSearchParams(urlHash.substring(1));
        const hasAccessToken = urlParams.get('access_token');
        const tokenType = urlParams.get('type');
        const currentPath = window.location.pathname;
        
        // If user just confirmed email, show confirmation page
        if (hasAccessToken && tokenType === 'signup' && currentPath === '/signin') {
          window.location.href = '/email-confirmed';
        }
        // Otherwise, if user just signed in normally on signin page, redirect to main
        else if (currentPath === '/signin') {
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
              session ? (
                <MainPage session={session} />
              ) : (
                <LandingPage onGetStarted={handleGetStarted} />
              )
            }
          />
          <Route
            path="/signin"
            element={session ? <Navigate to="/" /> : <SignIn />}
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