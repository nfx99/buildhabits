import React from 'react';

const EmailConfirmation = () => {
  const handleGoToHabits = () => {
    window.location.href = '/';
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem 2rem',
        borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.18), 0 2px 8px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '500px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          🎉
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          color: '#1e293b',
          margin: '0',
          letterSpacing: '-0.02em'
        }}>
          Welcome to BuildHabits!
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#6b7280',
          margin: '0',
          lineHeight: '1.6'
        }}>
          Your email has been successfully verified. You're all set to start building amazing habits!
        </p>
        
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #bbf7d0',
          width: '100%'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#059669',
            margin: '0 0 0.5rem 0'
          }}>
            Ready to get started?
          </h3>
          <p style={{
            fontSize: '0.95rem',
            color: '#047857',
            margin: '0',
            lineHeight: '1.5'
          }}>
            Create your first habit, track your progress, and build the life you want!
          </p>
        </div>
        
        <button
          onClick={handleGoToHabits}
          style={{
            width: '100%',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease',
            marginTop: '0.5rem'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }}
        >
          Go to My Habits →
        </button>
      </div>
    </div>
  );
};

export default EmailConfirmation; 