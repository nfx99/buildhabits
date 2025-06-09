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

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      
      // Handle email confirmation redirect
      if (event === 'SIGNED_IN' && session) {
        // Check if this is an email confirmation by looking for URL hash parameters
        const urlHash = window.location.hash;
        const urlParams = new URLSearchParams(urlHash.substring(1));
        const hasAccessToken = urlParams.get('access_token');
        const signupType = urlParams.get('type');
        
        // If user just confirmed email (has access token and type), show confirmation page
        if (hasAccessToken && signupType === 'signup' && window.location.pathname === '/signin') {
          window.location.href = '/email-confirmed';
        }
        // Otherwise, if user just signed in normally on signin page, redirect to main
        else if (window.location.pathname === '/signin') {
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