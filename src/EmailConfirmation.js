import React, { useEffect, useState } from 'react';
import { supabase } from './config/supabase';
import './EmailConfirmation.css';

const EmailConfirmation = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('EmailConfirmation - Current session:', session);
      setSession(session);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('EmailConfirmation - Auth state changed:', event, session);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoToHabits = () => {
    if (session) {
      console.log('User is authenticated, redirecting to habits');
      window.location.href = '/';
    } else {
      console.log('User not authenticated yet, trying to refresh session');
      // Try to refresh the session first
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('Session found after refresh, redirecting');
          window.location.href = '/';
        } else {
          console.log('No session found, redirecting to signin');
          window.location.href = '/signin';
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="confirmation-container">
        <div className="animated-bg"></div>
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <h2>Setting up your account...</h2>
          <p>Almost ready to start building habits!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-container">
      {/* Animated background */}
      <div className="animated-bg"></div>
      
      {/* Confetti particles */}
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              backgroundColor: [
                'var(--accent-primary)',
                'var(--success)',
                'var(--warning)',
                '#8b5cf6',
                '#ec4899',
                '#06b6d4'
              ][Math.floor(Math.random() * 6)]
            }}
          />
        ))}
      </div>

      <div className="confirmation-content">
        <div className="confirmation-card">
          <div className="success-icon">
            <svg viewBox="0 0 50 50" className="checkmark">
              <circle className="checkmark-circle" cx="25" cy="25" r="25"/>
              <path className="checkmark-check" d="M14,27 L22,35 L38,16"/>
            </svg>
          </div>
          
          <h1 className="confirmation-title">
            Welcome to BuildHabits!
          </h1>
          
          <p className="confirmation-subtitle">
            Your email has been successfully verified. You're all set to start building amazing habits!
          </p>

          {session && (
            <div className="auth-status">
              <div className="auth-indicator">✓</div>
              <p>Account authenticated as <strong>{session.user.email}</strong></p>
            </div>
          )}
          
          <div className="info-card">
            <h3>Ready to get started?</h3>
            <p>Create your first habit, track your progress, and build the life you want!</p>
          </div>
          
          <button
            onClick={handleGoToHabits}
            className={`confirmation-button ${session ? 'ready' : 'loading'}`}
            disabled={!session}
          >
            {session ? (
              <>
                Go to My Habits
                <svg viewBox="0 0 24 24" className="button-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            ) : (
              <>
                <div className="button-spinner"></div>
                Setting up account...
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation; 