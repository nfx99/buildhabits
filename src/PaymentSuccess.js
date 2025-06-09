import React from 'react';

const PaymentSuccess = () => (
  <div style={{ textAlign: 'center', marginTop: '4rem' }}>
    <h1>🎉 Payment Successful!</h1>
    <p>Thank you for your purchase. Your account has been upgraded to premium.</p>
    <a href="/" style={{
      display: 'inline-block',
      marginTop: '2rem',
      padding: '0.75rem 2rem',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: 'white',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: '1.1rem',
      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.10)'
    }}>Go to Dashboard</a>
  </div>
);

export default PaymentSuccess; 