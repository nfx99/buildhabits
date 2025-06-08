import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import './MainPage.css';

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

  useEffect(() => {
    fetchHabits();
    checkPaymentStatus();
  }, [session]);

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

  const checkPaymentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'succeeded')
        .maybeSingle();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      setHasPaid(!!data);
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const fetchHabits = async () => {
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
      window.location.href = `https://buy.stripe.com/7sY9ATfh71P8cmH0jF0Ny01?client_reference_id=${session.user.id}`;
    } catch (error) {
      console.error('Error initiating payment:', error);
      setToastMessage('Error initiating payment');
      setShowToast(true);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="main-page" data-theme={theme}>
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
                    {session.user.email?.[0]?.toUpperCase() || '👤'}
                  </div>
                  <div className="profile-details">
                    <h3>{session.user.email}</h3>
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
                      onClick={() => {
                        setIsProfileDialogOpen(false);
                        setIsPaymentDialogOpen(true);
                      }}
                    >
                      Upgrade Now - $4.99
                    </button>
                  </div>
                )}
              </div>
            </Dialog.Description>
            <div className="dialog-buttons">
              <button 
                onClick={() => {
                  setIsProfileDialogOpen(false);
                  handleSignOut();
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