import React from 'react';

const PaymentCancelled = () => (
  <div style={{ textAlign: 'center', marginTop: '4rem' }}>
    <h1>Payment Cancelled</h1>
    <p>Your payment was cancelled. If this was a mistake, you can try again.</p>
    <a href="/" style={{
      display: 'inline-block',
      marginTop: '2rem',
      padding: '0.75rem 2rem',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: '1.1rem',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.10)'
    }}>Go back to Dashboard</a>
  </div>
);

export default PaymentCancelled; 