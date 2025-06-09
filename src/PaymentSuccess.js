import React, { useEffect } from 'react';

const PaymentSuccess = () => {
  useEffect(() => {
    // Store a flag to indicate payment was just completed
    localStorage.setItem('payment-completed', 'true');
  }, []);

  const handleGoToDashboard = () => {
    // Ensure the flag is set when user clicks the button
    localStorage.setItem('payment-completed', 'true');
    window.location.href = '/';
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1>🎉 Payment Successful!</h1>
      <p>Thank you for your purchase. Your account has been upgraded to premium.</p>
      <button onClick={handleGoToDashboard} style={{
        display: 'inline-block',
        marginTop: '2rem',
        padding: '0.75rem 2rem',
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '1.1rem',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.10)',
        border: 'none',
        cursor: 'pointer'
      }}>Go to Dashboard</button>
    </div>
  );
};

export default PaymentSuccess; 