import React, { useEffect, useState } from 'react';
import { supabase } from './config/supabase';
import confetti from 'canvas-confetti';
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
          const { error } = await supabase.auth.setSession({
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

  useEffect(() => {
    // Confetti celebration effect
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // since particles fall down, start a bit higher than random
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);

    // Cleanup function to clear interval when component unmounts
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
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