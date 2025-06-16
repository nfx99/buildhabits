import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import './MainPage.css';
import { loadStripe } from '@stripe/stripe-js';
import { format, startOfDay, addDays } from 'date-fns';

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

  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');

  const checkPaymentStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, is_premium')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        throw error;
      }
      
      if (!data) {
        try {
          const newUsername = `User${Math.floor(Math.random() * 10000)}`;
          
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([
              {
                user_id: session.user.id,
                username: newUsername,
                is_premium: false
              }
            ])
            .select()
            .single();

          if (createError) {
            return false;
          } else {
            setUsername(newProfile.username);
            setHasPaid(false);
            return false;
          }
        } catch (createError) {
          return false;
        }
      } else {
        const isPremium = data.is_premium || false;
        setHasPaid(isPremium);
        setUsername(data.username || '');
        
        if (isPremium && !hasPaid) {
          setToastMessage('🎉 Premium upgrade successful! You now have unlimited habits.');
          setShowToast(true);
        }
        
        return isPremium;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }, [session.user.id, hasPaid]);

  const verifyPaymentWithStripe = useCallback(async (sessionId) => {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId: session.user.id
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.isPremium) {
        setHasPaid(true);
        setToastMessage('🎉 Payment verified! You now have premium access.');
        setShowToast(true);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }, [session.user.id]);

  const fetchHabits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select(`
          *,
          habit_completions(*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      setHabits(data || []);
    } catch (error) {
      setToastMessage('Error fetching habits');
      setShowToast(true);
    }
  }, [session.user.id]);

  useEffect(() => {
    const initialize = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        let attempts = 0;
        const maxAttempts = 5;
        const delayMs = 2000;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          const paymentConfirmed = await checkPaymentStatus();
          if (!paymentConfirmed) {
            const stripeVerified = await verifyPaymentWithStripe(sessionId);
            if (stripeVerified) {
              break;
            }
          } else {
            break;
          }
          
          attempts++;
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        await checkPaymentStatus();
      }
      
      await fetchHabits();
      setLoading(false);
    };

    initialize();
  }, [checkPaymentStatus, verifyPaymentWithStripe, fetchHabits]);



  const handleCreateHabit = async (e) => {
    e.preventDefault();
    
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
            user_id: session.user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from habit creation');
      }

      setHabits([data, ...habits]);
      setNewHabitName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      setToastMessage(error.message || 'Error creating habit. Please try again.');
      setShowToast(true);
    }
  };

  const handleCompleteHabit = async (habitId, date, isUndo = false) => {
    try {
      // Use the exact date format that's stored in the database
      const targetDate = format(date, 'yyyy-MM-dd');
      
      if (isUndo) {
        // For undo, delete using date range (faster than fetching all completions)
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('habit_id', habitId)
          .gte('date', targetDate + 'T00:00:00.000Z')
          .lte('date', targetDate + 'T23:59:59.999Z');

        if (error) throw error;
      } else {
        // For new completion, store as ISO timestamp to match existing format
        const { error } = await supabase
          .from('habit_completions')
          .insert({
            habit_id: habitId,
            date: new Date(targetDate + 'T12:00:00.000Z').toISOString(),
          });

        if (error) throw error;
      }

      // Optimistically update the UI instead of refetching all data
      setHabits(prevHabits => 
        prevHabits.map(habit => {
          if (habit.id === habitId) {
            const updatedCompletions = isUndo
              ? habit.habit_completions?.filter(completion => 
                  format(new Date(completion.date), 'yyyy-MM-dd') !== targetDate
                ) || []
              : [
                  ...(habit.habit_completions || []),
                  {
                    id: `temp-${Date.now()}`,
                    habit_id: habitId,
                    date: new Date(targetDate + 'T12:00:00.000Z').toISOString(),
                    created_at: new Date().toISOString()
                  }
                ];
            
            return {
              ...habit,
              habit_completions: updatedCompletions
            };
          }
          return habit;
        })
      );
    } catch (error) {
      setToastMessage(isUndo ? 'Error removing habit completion' : 'Error completing habit');
      setShowToast(true);
    }
  };

  const handleUpgrade = async () => {
    try {
      if (!session || !session.user) {
        setToastMessage('Please sign in to upgrade');
        setShowToast(true);
        return;
      }

      setIsPaymentLoading(true);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          priceId: 'price_1QSeUIEeZvKYlo2CaFLjkmGF',
        }),
      });

      const { sessionId, error, message } = await response.json();

      if (error) {
        setToastMessage(message || 'Failed to create checkout session');
        setShowToast(true);
        return;
      }

      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      
      if (!stripe) {
        setToastMessage('Payment system unavailable');
        setShowToast(true);
        return;
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        setToastMessage('Payment redirect failed');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('Error creating checkout session');
      setShowToast(true);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { data: currentSession } = await supabase.auth.getSession();
      
      if (!currentSession.session) {
        setHabits([]);
        setHasPaid(false);
        setToastMessage('Signed out successfully');
        setShowToast(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      setHabits([]);
      setHasPaid(false);
      setToastMessage('Signed out successfully');
      setShowToast(true);
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      if (error.message.includes('Auth session missing')) {
        setHabits([]);
        setHasPaid(false);
        setToastMessage('Signed out successfully');
        setShowToast(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
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

      fetchHabits();
    } catch (error) {
      setToastMessage('Failed to delete habit. Please try again.');
      setShowToast(true);
    }
  };

  const handleEditHabit = async (habitId, newName) => {
    try {
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

      fetchHabits();
    } catch (error) {
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
      setToastMessage('Username cannot be empty');
      setShowToast(true);
      return;
    }

    if (sanitizedUsername.length < 2) {
      setToastMessage('Username must be at least 2 characters');
      setShowToast(true);
      return;
    }

    if (sanitizedUsername.length > 20) {
      setToastMessage('Username must be less than 20 characters');
      setShowToast(true);
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', sanitizedUsername)
        .neq('user_id', session.user.id)
        .single();

      if (existingUser) {
        setToastMessage('Username already taken. Please choose another.');
        setShowToast(true);
        return;
      }
    } catch (checkError) {
      if (checkError.code !== 'PGRST116') {
        setToastMessage('Error checking username availability');
        setShowToast(true);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert([
          {
            user_id: session.user.id,
            username: sanitizedUsername,
            is_premium: hasPaid
          }
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setToastMessage('Username already taken. Please choose another.');
          setShowToast(true);
          return;
        }
        throw error;
      }

      setUsername(sanitizedUsername);
      setIsEditingUsername(false);
      setToastMessage('Username updated successfully!');
      setShowToast(true);
      
    } catch (error) {
      setToastMessage(`Error updating username: ${error.message}`);
      setShowToast(true);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className={`main-page ${(isCreateDialogOpen || isPaymentDialogOpen || isProfileDialogOpen) ? 'dialog-active' : ''}`}>
      <header className="header">
        <div className="header-left">
        </div>
        <h1> {'Build Habits'}</h1>
        <div className="header-right">
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
            <Dialog.Title>Upgrade to Premium</Dialog.Title>
            <Dialog.Description>
              <div className="payment-content">
                <h3>🚀 Go Premium!</h3>
                <p>Unlock unlimited habits and advanced features to supercharge your habit building journey.</p>
                
                <button 
                  className="payment-price-button"
                  onClick={handleUpgrade}
                  disabled={isPaymentLoading}
                >
                  <div className="price">$4.99</div>
                  <div className="price-note">One-time payment</div>
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
                  setIsProfileDialogOpen(false);
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
        duration={3000}
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

