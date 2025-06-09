import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import './MainPage.css';
import { loadStripe } from '@stripe/stripe-js';

const MainPage = ({ session }) => {
  const [habits, setHabits] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [theme, setTheme] = useState(() => {
    // Get theme from document attribute (set by HTML script) or fallback to localStorage/default
    const documentTheme = document.documentElement.getAttribute('data-theme');
    return documentTheme || localStorage.getItem('theme') || 'light';
  });
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');

  // Define functions before useEffect hooks to avoid use-before-define warnings
  const checkPaymentStatus = useCallback(async () => {
    try {
      console.log('Checking payment status for user:', session.user.id);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_premium, premium_since, username')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      console.log('Payment status data:', data);
      const isPremium = data?.is_premium || false;
      setHasPaid(isPremium);
      setUsername(data?.username || '');
      
      if (isPremium && !hasPaid) {
        // Premium status was just detected, show a success message
        setToastMessage('🎉 Premium upgrade successful! You now have unlimited habits.');
        setShowToast(true);
      }
      
      return isPremium;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }, [session.user.id, hasPaid]);

  // Backup function to verify payment via Stripe session ID
  const verifyPaymentWithStripe = useCallback(async (sessionId) => {
    try {
      console.log('Verifying payment with Stripe session:', sessionId);
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          userId: session.user.id
        }),
      });

      const result = await response.json();
      console.log('Stripe verification result:', result);

      if (result.success && result.isPaid) {
        // Payment was successful, refresh status
        await checkPaymentStatus();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying payment with Stripe:', error);
      return false;
    }
  }, [session.user.id, checkPaymentStatus]);

  const fetchHabits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select(`
          id,
          name,
          created_at,
          user_id,
          habit_completions (
            id,
            date,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      setHabits(data || []);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
    checkPaymentStatus();
  }, [session, checkPaymentStatus, fetchHabits]);

  // Check payment status when user returns from payment
  useEffect(() => {
    const handlePaymentReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const paymentCompleted = localStorage.getItem('payment-completed');
      
      if (sessionId || paymentCompleted) {
        // User returned from Stripe checkout, refresh payment status
        console.log('User returned from payment, checking status...');
        
        // Clear the flag
        localStorage.removeItem('payment-completed');
        
        // Add multiple checks with delays to ensure webhook has processed
        const checkMultipleTimes = async () => {
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            console.log(`Payment status check attempt ${i + 1}`);
            const isPremium = await checkPaymentStatus();
            
            // If still not premium after 3 attempts and we have a session ID, try Stripe verification
            if (!isPremium && i >= 2 && sessionId) {
              console.log('Webhook may have failed, trying Stripe verification...');
              const stripeResult = await verifyPaymentWithStripe(sessionId);
              if (stripeResult) {
                console.log('Stripe verification successful, breaking loop');
                break;
              }
            }
            
            if (isPremium) {
              console.log('Premium status confirmed, breaking loop');
              break;
            }
          }
        };
        
        checkMultipleTimes();
      }
    };

    handlePaymentReturn();
  }, [checkPaymentStatus, verifyPaymentWithStripe]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Only set if different to avoid unnecessary DOM updates
    if (document.documentElement.getAttribute('data-theme') !== theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };



  const handleCreateHabit = async (e) => {
    e.preventDefault();
    
    // Sanitize input
    const sanitizedName = newHabitName.trim();
    if (!sanitizedName) {
      setToastMessage('Please enter a valid habit name');
      setShowToast(true);
      return;
    }
    
    if (!hasPaid && habits.length >= 2) {
      setToastMessage('Please complete payment to create more habits');
      setShowToast(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert([
          {
            name: sanitizedName,
            user_id: session.user.id.toString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from habit creation');
      }

      setHabits([data, ...habits]);
      setNewHabitName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating habit:', error);
      setToastMessage(error.message || 'Error creating habit. Please try again.');
      setShowToast(true);
    }
  };

  const handleCompleteHabit = async (habitId, date, isUndo = false) => {
    try {
      if (isUndo) {
        // Delete the completion record
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('habit_id', habitId)
          .eq('date', date.toISOString().split('T')[0]);

        if (error) throw error;
      } else {
        // Insert a new completion record
        const { error } = await supabase
          .from('habit_completions')
          .insert([
            {
              habit_id: habitId,
              date: date.toISOString().split('T')[0],
            },
          ]);

        if (error) throw error;
      }
      
      fetchHabits();
    } catch (error) {
      console.error('Error completing habit:', error);
      setToastMessage(isUndo ? 'Error undoing habit' : 'Error completing habit');
      setShowToast(true);
    }
  };

  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        return;
      }

      console.log('Creating checkout session for user:', session.user.id);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          priceId: 'price_1RXMtIEVtge1S4ocSIFIGoG1'
        }),
      });

      const { sessionId, message, error } = await response.json();
      console.log('Checkout session created:', sessionId);

      if (!sessionId) {
        console.error('Failed to create checkout session:', message, error);
        setToastMessage('Failed to create checkout session. Please try again.');
        setShowToast(true);
        return;
      }

      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        console.error('Stripe failed to load');
        setToastMessage('Stripe failed to load. Please refresh and try again.');
        setShowToast(true);
        return;
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) {
        console.error('Stripe redirect error:', stripeError);
        setToastMessage('Stripe redirect error. Please try again.');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setToastMessage('Error creating checkout session. Please try again.');
      setShowToast(true);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleUpgrade = () => {
    setIsProfileDialogOpen(false);
    handlePayment();
  };

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...');
      setToastMessage('Signing out...');
      setShowToast(true);
      
      // Check if there's an active session first
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Current session:', currentSession);
      
      if (currentSession) {
        // Only try to sign out if there's an active session
        const { error } = await supabase.auth.signOut();
        console.log('Sign out response:', { error });
        
        if (error) {
          console.error('Sign out error:', error);
          throw error;
        }
      } else {
        console.log('No active session found, proceeding with local cleanup');
      }
      
      console.log('Sign out successful, clearing state...');
      
      // Clear any local state
      setHabits([]);
      setHasPaid(false);
      
      // Show success message briefly then redirect
      setToastMessage('Signed out successfully');
      setShowToast(true);
      
      console.log('Redirecting to home page...');
      
      // Force navigation to home page after a brief delay
      setTimeout(() => {
        console.log('Executing redirect...');
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Error signing out:', error);
      
      // If it's a session missing error, still proceed with local cleanup and redirect
      if (error.message.includes('Auth session missing')) {
        console.log('Session already missing, proceeding with cleanup...');
        setHabits([]);
        setHasPaid(false);
        setToastMessage('Signed out successfully');
        setShowToast(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        // For other errors, show the error message
        setToastMessage(`Failed to sign out: ${error.message}`);
        setShowToast(true);
      }
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

      if (error) throw error;

      // Refresh habits after deletion
      fetchHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
      setToastMessage('Failed to delete habit. Please try again.');
      setShowToast(true);
    }
  };

  const handleEditHabit = async (habitId, newName) => {
    try {
      // Sanitize input
      const sanitizedName = newName.trim();
      if (!sanitizedName) {
        setToastMessage('Please enter a valid habit name');
        setShowToast(true);
        return;
      }

      const { error } = await supabase
        .from('habits')
        .update({ name: sanitizedName })
        .eq('id', habitId);

      if (error) throw error;

      // Refresh habits after editing
      fetchHabits();
    } catch (error) {
      console.error('Error editing habit:', error);
      setToastMessage('Error editing habit');
      setShowToast(true);
    }
  };

  const handleStartEditingUsername = () => {
    setEditingUsername(username);
    setIsEditingUsername(true);
  };

  const handleCancelEditingUsername = () => {
    setEditingUsername('');
    setIsEditingUsername(false);
  };

  const handleSaveUsername = async () => {
    const sanitizedUsername = editingUsername.trim();
    
    if (!sanitizedUsername) {
      setToastMessage('Please enter a valid username');
      setShowToast(true);
      return;
    }

    if (sanitizedUsername === username) {
      setIsEditingUsername(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', sanitizedUsername)
        .neq('user_id', session.user.id)
        .single();

      if (existingUser) {
        setToastMessage('Username already taken. Please choose another one.');
        setShowToast(true);
        return;
      }

      // Update username
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: sanitizedUsername })
        .eq('user_id', session.user.id);

      if (error) throw error;

      setUsername(sanitizedUsername);
      setIsEditingUsername(false);
      setToastMessage('Username updated successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('Error updating username:', error);
      setToastMessage('Error updating username. Please try again.');
      setShowToast(true);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className={`main-page ${(isCreateDialogOpen || isPaymentDialogOpen || isProfileDialogOpen) ? 'dialog-active' : ''}`} data-theme={theme}>
      <header className="header">
        <div className="header-left">
        </div>
        <h1>Build Habits</h1>
        <div className="header-right">
          <button onClick={toggleTheme} className="theme-toggle" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="profile-button" onClick={() => setIsProfileDialogOpen(true)}>
            Profile
          </button>
        </div>
      </header>

      <div className="habits-container">
        <button
          className="create-habit-button"
          onClick={() => {
            if (!hasPaid && habits.length >= 2) {
              setIsPaymentDialogOpen(true);
            } else {
              setIsCreateDialogOpen(true);
            }
          }}
        >
          Create New Habit
        </button>

        <div className="habits-grid">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onComplete={handleCompleteHabit}
              onDelete={handleDeleteHabit}
              onEdit={handleEditHabit}
              theme={theme}
            />
          ))}
        </div>
      </div>

      <Dialog.Root open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Create New Habit</Dialog.Title>
            <form onSubmit={handleCreateHabit}>
              <div className="form-group">
                <label htmlFor="habit-name">Habit Name</label>
                <input
                  id="habit-name"
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  required
                />
              </div>
              <div className="dialog-buttons">
                <button type="submit">Create</button>
                <button
                  type="button"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content payment-dialog">
            <Dialog.Title>🚀 Unlock Unlimited Habits</Dialog.Title>
            <Dialog.Description>
              <div className="payment-content">
                <h3>Ready to build more habits?</h3>
                <p>You've created your first 2 habits! Unlock unlimited habit tracking with a one-time payment.</p>
                <button 
                  className="payment-price-button"
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    handlePayment();
                  }}
                  disabled={isPaymentLoading}
                >
                  <span className="price">$4.99</span>
                  <span className="price-note">{isPaymentLoading ? 'Processing...' : 'One-time payment'}</span>
                </button>
              </div>
            </Dialog.Description>
            <div className="dialog-buttons">
              <button onClick={() => setIsPaymentDialogOpen(false)}>
                Maybe Later
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content profile-dialog">
            <Dialog.Title>Profile</Dialog.Title>
            <Dialog.Description>
              <div className="profile-content">
                <div className="profile-info">
                  <div className="profile-avatar">
                    {username?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || '👤'}
                  </div>
                  <div className="profile-details">
                    <div className="username-section">
                      {isEditingUsername ? (
                        <div className="username-edit">
                          <input
                            type="text"
                            value={editingUsername}
                            onChange={(e) => setEditingUsername(e.target.value)}
                            placeholder="Enter username"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveUsername();
                              } else if (e.key === 'Escape') {
                                handleCancelEditingUsername();
                              }
                            }}
                          />
                          <div className="username-edit-buttons">
                            <button 
                              className="save-username-btn"
                              onClick={handleSaveUsername}
                            >
                              ✓
                            </button>
                            <button 
                              className="cancel-username-btn"
                              onClick={handleCancelEditingUsername}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="username-display">
                          <h3>{username || 'No username set'}</h3>
                          <button 
                            className="edit-username-btn"
                            onClick={handleStartEditingUsername}
                            title="Edit username"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                    <p>{session.user.email}</p>
                    <p>Joined {new Date(session.user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="profile-stats">
                  <div className="stat">
                    <div className="stat-number">{habits.length}</div>
                    <div className="stat-label">Active Habits</div>
                  </div>
                  <div className="stat">
                    <div className="stat-number">
                      {habits.reduce((total, habit) => total + (habit.habit_completions?.length || 0), 0)}
                    </div>
                    <div className="stat-label">Total Completions</div>
                  </div>
                  <div className="stat">
                    <div className="stat-number">{hasPaid ? 'Pro' : 'Free'}</div>
                    <div className="stat-label">Plan</div>
                  </div>
                </div>

                {!hasPaid && (
                  <div className="profile-upgrade">
                    <h4>🚀 Upgrade to Pro</h4>
                    <p>Unlock unlimited habits and advanced features</p>
                    <button 
                      className="upgrade-button"
                      onClick={handleUpgrade}
                    >
                      Upgrade Now - $4.99
                    </button>
                  </div>
                )}
              </div>
            </Dialog.Description>
            <div className="dialog-buttons">
              <button 
                onClick={async () => {
                  // Close dialog first
                  setIsProfileDialogOpen(false);
                  // Then handle sign out
                  await handleSignOut();
                }}
                className="sign-out-button"
              >
                Sign Out
              </button>
              <button onClick={() => setIsProfileDialogOpen(false)}>
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast.Root
        className="toast-root"
        open={showToast}
        onOpenChange={setShowToast}
      >
        <Toast.Title className="toast-title">Notification</Toast.Title>
        <Toast.Description className="toast-description">
          {toastMessage}
        </Toast.Description>
        <Toast.Close className="toast-action" aria-label="Close">
          <span aria-hidden>×</span>
        </Toast.Close>
      </Toast.Root>
    </div>
  );
};

export default MainPage; 
