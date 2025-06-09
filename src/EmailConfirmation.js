import React, { useEffect, useState } from 'react';
import { supabase } from './config/supabase';
import './EmailConfirmation.css';

const EmailConfirmation = () => {
  const [sessionEstablished, setSessionEstablished] = useState(false);

  useEffect(() => {
    const processEmailConfirmation = async () => {
      // Get tokens from URL hash
      const urlHash = window.location.hash;
      const urlParams = new URLSearchParams(urlHash.substring(1));
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');

      if (accessToken && refreshToken) {
        try {
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
          } else {
            console.log('Session established successfully');
            setSessionEstablished(true);
          }
        } catch (error) {
          console.error('Error processing tokens:', error);
        }
      } else {
        // If no tokens, check if session already exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionEstablished(true);
        }
      }
    };

    processEmailConfirmation();
  }, []);

  const handleGoToHabits = () => {
    // Since user is on this page, they came from email confirmation
    // The auth tokens are in the URL, so redirect and let App.js handle the session
    window.location.href = '/';
  };

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
          
          <div className="info-card">
            <h3>Ready to get started?</h3>
            <p>Create your first habit, track your progress, and build the life you want!</p>
          </div>
          
          {sessionEstablished ? (
            <button
              onClick={handleGoToHabits}
              className="confirmation-button ready"
            >
              Go to My Habits
              <svg viewBox="0 0 24 24" className="button-arrow">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ) : (
            <div className="confirmation-button loading">
              <div className="button-spinner"></div>
              Setting up your account...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation; 