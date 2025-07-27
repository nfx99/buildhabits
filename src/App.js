import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import * as Toast from '@radix-ui/react-toast';
import { supabase } from './config/supabase';

// Lazy load heavy dependencies
const SignIn = lazy(() => import('./Sign-In/SignIn'));
const MainPage = lazy(() => import('./MainPage/MainPage'));
const LandingPage = lazy(() => import('./LandingPage/LandingPage'));
const UserProfile = lazy(() => import('./UserProfile/UserProfile'));
const Archive = lazy(() => import('./Archive/Archive'));
const PaymentSuccess = lazy(() => import('./PaymentSuccess'));

const EmailConfirmation = lazy(() => import('./EmailConfirmation'));

// Preload critical components for better UX
const preloadCriticalComponents = () => {
  // Preload the most commonly used components
  import('./MainPage/MainPage');
  import('./LandingPage/LandingPage');
};

// Start preloading after initial render
if (typeof window !== 'undefined') {
  setTimeout(preloadCriticalComponents, 1000);
}

// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#FFFFFF',
    color: '#14000A',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}>
    <div style={{
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #E5E7EB',
        borderTop: '3px solid #000000',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
      }}></div>
      <div style={{
        fontSize: '1rem',
        color: '#6B7280',
        fontWeight: '500'
      }}>Loading...</div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

function App() {
  const [session, setSession] = React.useState(null);
  const [isEmailConfirmation, setIsEmailConfirmation] = React.useState(false);
  
  // Check if this is an account deletion redirect
  const urlParams = new URLSearchParams(window.location.search);
  const isAccountDeleted = urlParams.get('account_deleted') === 'true';
  
  // Clean up the account_deleted parameter after a delay
  React.useEffect(() => {
    if (isAccountDeleted) {
      // Ensure session is cleared when account was deleted
      setSession(null);
      
      const timer = setTimeout(() => {
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('account_deleted');
        window.history.replaceState({}, '', newUrl.toString());
      }, 3000); // Clear after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isAccountDeleted]);

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
      console.log('🔍 Auth state change:', { event, session: !!session });
      setSession(session);
      
      // Handle sign out event
      if (event === 'SIGNED_OUT') {
        console.log('🔍 User signed out, clearing session');
        // Ensure session is properly cleared
        setSession(null);
        return;
      }
      
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
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                isEmailConfirmation ? (
                  <Navigate to="/email-confirmed" />
                ) : (session && !isAccountDeleted) ? (
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
                ) : (session && !isAccountDeleted) ? (
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
            <Route 
              path="/archive" 
              element={
                session ? (
                  <Archive session={session} />
                ) : (
                  <Navigate to="/signin" />
                )
              } 
            />
            <Route path="/email-confirmed" element={<EmailConfirmation />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />

          </Routes>
        </Suspense>
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </Router>
  );
}

export default App; 