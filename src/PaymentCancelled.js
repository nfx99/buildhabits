import React from 'react';
import './PaymentCancelled.css';

const PaymentCancelled = () => (
  <div className="payment-cancelled-container">
    <div className="animated-bg"></div>
    
    <div className="payment-cancelled-content">
      <div className="payment-cancelled-card">
        <div className="cancelled-icon">
          <svg viewBox="0 0 50 50" className="cancel-x">
            <circle className="cancel-circle" cx="25" cy="25" r="25"/>
            <path className="cancel-line1" d="M16,16 L34,34"/>
            <path className="cancel-line2" d="M34,16 L16,34"/>
          </svg>
        </div>
        
        <h1 className="payment-cancelled-title">Payment Cancelled</h1>
        <p className="payment-cancelled-subtitle">
          Your payment was cancelled. If this was a mistake, you can try again.
        </p>
        
        <div className="payment-cancelled-actions">
          <a href="/" className="payment-cancelled-button primary">
            Go back to Dashboard
            <svg viewBox="0 0 24 24" className="button-arrow">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <p className="retry-text">Need help? Contact support or try your payment again.</p>
        </div>
      </div>
    </div>
  </div>
);

export default PaymentCancelled; 