import React, { useEffect } from 'react';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  useEffect(() => {
    // Get the session ID from URL to pass to main page
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      // Store the session ID for the main page to process
      localStorage.setItem('stripe-session-id', sessionId);
    }
  }, []);

  const handleGoToDashboard = () => {
    // Get the session ID from URL to pass to main page
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      // Redirect with session ID so main page can verify payment
      window.location.href = `/?session_id=${sessionId}`;
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="payment-success-container">
      <div className="animated-bg"></div>
      
      <div className="payment-success-content">
        <div className="payment-success-card">
          <div className="success-icon">
            <svg viewBox="0 0 50 50" className="checkmark">
              <circle className="checkmark-circle" cx="25" cy="25" r="25"/>
              <path className="checkmark-check" d="M14,27 L22,35 L38,16"/>
            </svg>
          </div>
          
          <h1 className="payment-success-title">🎉 Payment Successful!</h1>
          <p className="payment-success-subtitle">
            Thank you for your purchase. Your account has been upgraded to premium.
          </p>
          
          <div className="payment-success-features">
            <div className="feature-item">
              <span className="feature-icon">✨</span>
              <span>Unlimited habits</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Smart insights & analytics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏆</span>
              <span>Achievement badges</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <span>Trend analysis</span>
            </div>
          </div>
          
          <button onClick={handleGoToDashboard} className="payment-success-button">
            Go to Dashboard
            <svg viewBox="0 0 24 24" className="button-arrow">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 