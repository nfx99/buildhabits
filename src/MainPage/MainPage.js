import React, { useState, useEffect, useCallback, lazy } from 'react';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import PricingModal from '../components/PricingModal';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import { loadStripe } from '@stripe/stripe-js';
import { format } from 'date-fns';
import { getHabitStats } from '../utils/tierSystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

// Preload Stripe to improve payment performance
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Lazy load heavy components for better performance
const DraggablePlannerWidget = lazy(() => import('../Planner/DraggablePlannerWidget'));

// Lazy load Friends component
const Friends = lazy(() => import('../Friends/Friends'));
const Planner = lazy(() => import('../Planner/Planner'));

const MainPage = ({ session }) => {
  const [habits, setHabits] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isFriendsDialogOpen, setIsFriendsDialogOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [habitEditDialogStates, setHabitEditDialogStates] = useState({});
  const [habitDeleteDialogStates, setHabitDeleteDialogStates] = useState({});
  const [habitLogProgressDialogStates, setHabitLogProgressDialogStates] = useState({});
  const [habitMoreMenuStates, setHabitMoreMenuStates] = useState({});
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const [isQuantifiable, setIsQuantifiable] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasInsights, setHasInsights] = useState(false);
  const [insightSettings, setInsightSettings] = useState({
    showCurrentStreak: true,
    showTotalDays: true,
    showProgressBar: true
  });
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');
  const [showUserPoints, setShowUserPoints] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarViewMode, setCalendarViewMode] = useState('year');
  const [currentView, setCurrentView] = useState('habits'); // 'habits' or 'planner'
  const [plannerRefreshTrigger, setPlannerRefreshTrigger] = useState(0);

  // State for stored user points
  const [userPoints, setUserPoints] = useState(0);

  const navigate = useNavigate();

  // Calculate overall stats from all habits
  const overallStats = React.useMemo(() => {
    if (!habits.length) return { totalPoints: userPoints, totalDays: 0, currentStreak: 0 };
    
    let totalDays = 0;
    let maxStreak = 0;
    
    habits.forEach(habit => {
      const stats = getHabitStats(habit);
      totalDays += stats.totalDays;
      maxStreak = Math.max(maxStreak, stats.currentStreak);
    });
    
    return {
      totalPoints: userPoints, // Use stored points from database
      totalDays,
      currentStreak: maxStreak
    };
  }, [habits, userPoints]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const checkPaymentStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, is_premium, points')
        .eq('user_id', session.user.id);

      if (error) {
        
        // Handle specific RLS/permission errors
        if (error.code === 'PGRST301' || error.code === '42501' || error.message.includes('row-level security') || error.message.includes('permission denied')) {
          
          // Try to create a new profile
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
              console.error('Profile creation error:', createError);
              // Set default values if profile creation fails
              setUsername(`User${Math.floor(Math.random() * 10000)}`);
              setHasPaid(false);
              return false;
            } else {
              setUsername(newProfile.username);
              setHasPaid(false);
              return false;
            }
          } catch (createError) {
            console.error('Profile creation failed:', createError);
            // Set default values
            setUsername(`User${Math.floor(Math.random() * 10000)}`);
            setHasPaid(false);
            return false;
          }
        }
        
        // For other errors, also set defaults and continue
        console.error('Other profile error:', error);
        setUsername(`User${Math.floor(Math.random() * 10000)}`);
        setHasPaid(false);
        return false;
      }
      
      if (!data || data.length === 0) {
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
            console.error('Profile creation error:', createError);
            setUsername(newUsername);
            setHasPaid(false);
            return false;
          } else {
            setUsername(newProfile.username);
            setHasPaid(false);
            return false;
          }
        } catch (createError) {
          console.error('Profile creation failed:', createError);
          setUsername(`User${Math.floor(Math.random() * 10000)}`);
          setHasPaid(false);
          return false;
        }
      } else {
        const profile = data[0]; // Get first (and should be only) result
        const isPremium = profile.is_premium || false;
        const wasAlreadyPremium = hasPaid; // Store previous state
        setHasPaid(isPremium);
        setUsername(profile.username || '');
        setUserPoints(profile.points || 0);
        
        // Only show congratulations if:
        // 1. User is now premium
        // 2. They weren't premium before (first time detection)
        // 3. We haven't already shown this notification (check localStorage)
        const hasShownCongrats = localStorage.getItem(`premium-congrats-${session.user.id}`);
        
        if (isPremium && !wasAlreadyPremium && !hasShownCongrats) {
          setToastMessage('🎉 Premium upgrade successful! You now have unlimited habits.');
          setShowToast(true);
          // Mark that we've shown the congratulations for this user
          localStorage.setItem(`premium-congrats-${session.user.id}`, 'true');
        }
        
        return isPremium;
      }
      
      return false;
    } catch (error) {
      console.error('Unexpected error in checkPaymentStatus:', error);
      // Set default values and continue
      setUsername(`User${Math.floor(Math.random() * 10000)}`);
      setHasPaid(false);
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
      
      if (result.success && result.isPaid) {
        setHasPaid(true);
        
        // Only show congratulations if we haven't already shown it
        const hasShownCongrats = localStorage.getItem(`premium-congrats-${session.user.id}`);
        if (!hasShownCongrats) {
          setToastMessage('🎉 Payment verified! You now have premium access.');
          setShowToast(true);
          localStorage.setItem(`premium-congrats-${session.user.id}`, 'true');
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }, [session.user.id]);

  const fetchUserPoints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('points')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user points:', error);
        return;
      }
      
      setUserPoints(data?.points || 0);
    } catch (error) {
      console.error('fetchUserPoints error:', error);
    }
  }, [session.user.id]);

  const fetchHabits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select(`
          *,
          habit_completions!fk_habit_completions_habit_id(*)
        `)
        .eq('user_id', session.user.id)
        .eq('is_archived', false) // Only fetch non-archived habits
        .order('order', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // If habits don't have order set, assign them based on current order
      const habitsWithOrder = (data || []).map((habit, index) => ({
        ...habit,
        order: habit.order !== null ? habit.order : index
      }));
      setHabits(habitsWithOrder);
    } catch (error) {
      console.error('fetchHabits error:', error);
      setToastMessage(`Error fetching habits: ${error.message || error}`);
      setShowToast(true);
    }
  }, [session.user.id]);

  useEffect(() => {
    const initialize = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      // Start loading data immediately in parallel
      const dataPromises = [
        fetchHabits(),
        fetchUserPoints()
      ];
      
      // Handle payment verification separately
      if (sessionId) {
        let attempts = 0;
        const maxAttempts = 5;
        const delayMs = 2000;
        
        const paymentPromise = (async () => {
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
        })();
        
        // Wait for both data and payment verification in parallel
        await Promise.all([...dataPromises, paymentPromise]);
      } else {
        // For non-payment flows, check payment status in parallel with data loading
        await Promise.all([...dataPromises, checkPaymentStatus()]);
      }
      
      setLoading(false);
      setInitialLoad(false);
    };

    initialize();
  }, [checkPaymentStatus, verifyPaymentWithStripe, fetchHabits, fetchUserPoints, session.user.id]);

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
      // Check if insights are enabled but no specific insights are selected
      let finalHasInsights = hasInsights;
      let finalInsightSettings = insightSettings;
      
      if (hasInsights) {
        const hasAnyInsightSelected = Object.values(insightSettings).some(value => value === true);
        if (!hasAnyInsightSelected) {
          // Disable insights if enabled but no specific insights are chosen
          finalHasInsights = false;
          finalInsightSettings = null;
        }
      }
      
      // Shift existing habits down by 1 to make room for new habit at top
      if (habits.length > 0) {
        const updates = habits.map(habit => ({
          id: habit.id,
          order: habit.order + 1
        }));

        // Update each habit's order
        for (const update of updates) {
          const { error } = await supabase
            .from('habits')
            .update({ order: update.order })
            .eq('id', update.id);

          if (error) {
            console.error('Error updating habit order:', error);
          }
        }
      }
      
      const habitData = {
        name: sanitizedName,
        user_id: session.user.id,
        order: 0, // New habit goes to the top
        color: '#000000',
        is_quantifiable: isQuantifiable,
        is_private: isPrivate,
        has_insights: finalHasInsights,
        insight_settings: finalHasInsights ? finalInsightSettings : null,
      };

      if (isQuantifiable) {
        habitData.target_value = parseFloat(targetValue) || 1;
        habitData.metric_unit = metricUnit;
      }

      const { data, error } = await supabase
        .from('habits')
        .insert([habitData])
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from habit creation');
      }

      // Update local state with new habit at the top
      const updatedHabits = habits.map(habit => ({
        ...habit,
        order: habit.order + 1
      }));
      setHabits([data, ...updatedHabits]);
      setNewHabitName('');

      setIsQuantifiable(false);
      setTargetValue('');
      setMetricUnit('');
      setIsPrivate(false);
          setHasInsights(false);
    setInsightSettings({
      showCurrentStreak: true,
      showTotalDays: true,
      showProgressBar: true
    });
      setIsCreateDialogOpen(false);
    } catch (error) {
      setToastMessage(error.message || 'Error creating habit. Please try again.');
      setShowToast(true);
    }
  };

  const handleCompleteHabit = async (habitId, date, isUndo = false, value = null) => {
    try {
      // Normalize the date to avoid timezone issues
      const targetDate = format(date, 'yyyy-MM-dd');
      const normalizedDate = new Date(targetDate + 'T12:00:00.000Z').toISOString();
      
      // Check if this is today's date for points awarding
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const isToday = targetDate === todayStr;
      
      if (isUndo) {
        // For undo, delete using exact date match
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('habit_id', habitId)
          .eq('date', normalizedDate)
          .eq('user_id', session.user.id);

        if (error) throw error;
        
        // Removed toast notifications for habit undo
      } else {
        // Check if completion already exists for this date
        const { data: existing, error: selectError } = await supabase
          .from('habit_completions')
          .select('id')
          .eq('habit_id', habitId)
          .eq('date', normalizedDate)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (selectError) throw selectError;

        const completionData = {
          habit_id: habitId,
          date: normalizedDate,
          user_id: session.user.id,
        };

        // Add value for quantifiable habits
        if (value !== null) {
          completionData.value = value;
        }

        if (existing) {
          // Update existing completion
          const { error } = await supabase
            .from('habit_completions')
            .update(completionData)
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // Insert new completion
          const { error } = await supabase
            .from('habit_completions')
            .insert(completionData);

          if (error) throw error;
        }
        
        // Removed toast notifications for habit completions
      }

      // Refetch habits and user points to ensure data consistency
      await Promise.all([fetchHabits(), fetchUserPoints()]);
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

      // Close any open dialogs and immediately open pricing modal
      setIsPaymentDialogOpen(false);
      setIsProfileDialogOpen(false);
      setIsCreateDialogOpen(false);
      setIsDeleteAccountDialogOpen(false);
      setIsFriendsDialogOpen(false);
      setIsPricingModalOpen(true);
    } catch (error) {
      console.error('Error opening pricing modal:', error);
      setToastMessage('Error opening pricing modal. Please try again.');
      setShowToast(true);
    }
  };

  const handleSelectPlan = async (priceId, planType) => {
    try {
      setIsPaymentLoading(true);
      setIsPricingModalOpen(false);

      // Create a promise for the API call with timeout
      const createSessionPromise = Promise.race([
        fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id,
            priceId: priceId,
            planType: planType,
          }),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      // Parallelize Stripe loading and API call for better performance
      const [response, stripe] = await Promise.all([
        createSessionPromise,
        stripePromise
      ]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        setToastMessage(errorData.message || `Server error (${response.status}). Please try again.`);
        setShowToast(true);
        return;
      }

      const { sessionId, error, message } = await response.json();

      if (error) {
        setToastMessage(message || 'Failed to create checkout session');
        setShowToast(true);
        return;
      }

      if (!sessionId) {
        setToastMessage('Invalid checkout session. Please try again.');
        setShowToast(true);
        return;
      }

      if (!stripe) {
        setToastMessage('Payment system unavailable. Please disable ad blockers and try again.');
        setShowToast(true);
        return;
      }

      // Redirect to Stripe checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        console.error('Stripe Error:', stripeError);
        setToastMessage(`Payment redirect failed: ${stripeError.message}`);
        setShowToast(true);
      }
    } catch (error) {
      console.error('Upgrade Error:', error);
      if (error.message === 'Request timeout') {
        setToastMessage('Payment setup is taking longer than expected. Please try again.');
        setShowToast(true);
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setToastMessage('Network error. Please check your connection and try again.');
      } else {
        setToastMessage('Error creating checkout session. Please try again.');
      }
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

      if (error) {
        throw error;
      }

      setHabits(prev => prev.filter(habit => habit.id !== habitId));
      setHabitDeleteDialogStates(prev => {
        const newState = { ...prev };
        delete newState[habitId];
        return newState;
      });
      setToastMessage('Habit deleted successfully');
      setShowToast(true);
    } catch (error) {
      console.error('Error deleting habit:', error);
      setToastMessage('Error deleting habit');
      setShowToast(true);
    }
  };

  const handleArchiveHabit = async (habitId) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', habitId);

      if (error) {
        throw error;
      }

      setHabits(prev => prev.filter(habit => habit.id !== habitId));
      setToastMessage('Habit archived successfully');
      setShowToast(true);
    } catch (error) {
      console.error('Error archiving habit:', error);
      setToastMessage('Error archiving habit');
      setShowToast(true);
    }
  };

  const handleEditHabit = async (habitId, editData) => {
    try {
      const sanitizedName = editData.name.trim();
      if (!sanitizedName) {
        setToastMessage('Please enter a valid habit name');
        setShowToast(true);
        return;
      }

      const updateData = {
        name: sanitizedName,
        color: editData.color,
        is_quantifiable: editData.is_quantifiable,
        target_value: editData.target_value,
        metric_unit: editData.metric_unit,
        is_private: editData.is_private,
        has_insights: editData.has_insights,
        insight_settings: editData.insight_settings
      };

      const { error } = await supabase
        .from('habits')
        .update(updateData)
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

  const handleDeleteAccount = async () => {
    try {
      // Get the current session for authorization
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get session');
      }
      
      if (!currentSession) {
        throw new Error('No active session');
      }



      // Try refreshing the session first
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      const sessionToUse = refreshedSession || currentSession;
      
      if (refreshError) {
        console.warn('Could not refresh session, using current session:', refreshError);
      }

      // Call the Edge Function to completely delete the account
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToUse.access_token}`,
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Show success message
      setToastMessage('Account completely deleted. Redirecting...');
      setShowToast(true);
      
      // Wait a moment for the toast to show, then reload page
      // The user will be automatically signed out since their auth record no longer exists
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      setToastMessage(`Error deleting account: ${error.message}`);
      setShowToast(true);
    }
  };

  const handleShareProfile = async () => {
    try {
      const profileUrl = `${window.location.origin}/user/${session.user.id}`;
      await navigator.clipboard.writeText(profileUrl);
      setShowShareSuccess(true);
      setToastMessage('Profile link copied to clipboard!');
      setShowToast(true);
      
      // Reset share success state after 2 seconds
      setTimeout(() => {
        setShowShareSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setToastMessage('Error copying link to clipboard');
      setShowToast(true);
    }
  };

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = habits.findIndex((habit) => habit.id === active.id);
      const newIndex = habits.findIndex((habit) => habit.id === over.id);

      const newHabits = arrayMove(habits, oldIndex, newIndex);
      setHabits(newHabits);

      // Update the order in the database
      try {
        const updates = newHabits.map((habit, index) => ({
          id: habit.id,
          order: index
        }));

        // Update each habit's order
        for (const update of updates) {
          const { error } = await supabase
            .from('habits')
            .update({ order: update.order })
            .eq('id', update.id);

          if (error) {
            console.error('Error updating habit order:', error);
          }
        }
      } catch (error) {
        console.error('Error updating habit order:', error);
        setToastMessage('Error updating habit order');
        setShowToast(true);
        // Revert to original order on error
        fetchHabits();
      }
    }
  }, [habits, fetchHabits]);

  // Filter habits based on search query
  const filteredHabits = habits.filter(habit =>
    habit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle edit dialog state changes from habit cards
  const handleEditDialogChange = useCallback((habitId, isOpen) => {
    setHabitEditDialogStates(prev => ({
      ...prev,
      [habitId]: isOpen
    }));
  }, []);

  // Handle delete dialog state changes from habit cards
  const handleDeleteDialogChange = useCallback((habitId, isOpen) => {
    setHabitDeleteDialogStates(prev => ({
      ...prev,
      [habitId]: isOpen
    }));
  }, []);

  // Handle log progress dialog state changes from habit cards
  const handleLogProgressDialogChange = useCallback((habitId, isOpen) => {
    setHabitLogProgressDialogStates(prev => ({
      ...prev,
      [habitId]: isOpen
    }));
  }, []);

  // Handle more menu state changes from habit cards
  const handleMoreMenuChange = useCallback((habitId, isOpen) => {
    setHabitMoreMenuStates(prev => ({
      ...prev,
      [habitId]: isOpen
    }));
  }, []);

  // Check if any dialog is open
  const isAnyEditDialogOpen = Object.values(habitEditDialogStates).some(isOpen => isOpen);
  const isAnyDeleteDialogOpen = Object.values(habitDeleteDialogStates).some(isOpen => isOpen);
  const isAnyLogProgressDialogOpen = Object.values(habitLogProgressDialogStates).some(isOpen => isOpen);
  const isAnyMoreMenuOpen = Object.values(habitMoreMenuStates).some(isOpen => isOpen);

  const handlePlanHabit = async (habitId, plannedDate) => {
    try {
      const { error } = await supabase
        .from('habit_plans')
        .insert([{ 
          habit_id: habitId, 
          user_id: session.user.id,
          planned_date: plannedDate 
        }]);

      if (error) {
        if (error.code === '23505') { // unique constraint violation
          setToastMessage('This habit is already planned for this date.');
        } else {
          throw error;
        }
      } else {
        // Trigger planner refresh
        setPlannerRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error planning habit:', error);
      setToastMessage('Failed to plan habit. The table might not exist yet.');
    }
  };

  const handleHabitClick = (habitId) => {
    // Find the habit element and scroll to it
    const habitElement = document.querySelector(`[data-habit-id="${habitId}"]`);
    if (habitElement) {
      habitElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Improved loading component
  const LoadingScreen = () => (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your habits...</p>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`main-page ${(isCreateDialogOpen || isPaymentDialogOpen || isProfileDialogOpen || isDeleteAccountDialogOpen || isAnyEditDialogOpen || isAnyDeleteDialogOpen || isAnyLogProgressDialogOpen || isFriendsDialogOpen) ? 'dialog-active' : ''}`}>
      <header className="header">
        <div className="header-left">
        </div>
        <h1> {'Build Habits'}</h1>
        <div className="header-right">
          {!hasPaid && (
            <button 
              className="homescreen-upgrade-button"
              onClick={handleUpgrade}
              disabled={isPaymentLoading}
            >
              {isPaymentLoading ? 'Opening...' : 'Upgrade to Pro'}
            </button>
          )}
          <button 
            className="archive-button"
            onClick={() => navigate('/archive')}
            title="View archived habits"
          >
            📦 Archive
          </button>
          <button 
            className="quick-share-button"
            onClick={handleShareProfile}
            title="Share your profile"
          >
            Share
          </button>
          <button 
            className="friends-button"
            onClick={() => setIsFriendsDialogOpen(true)}
            title="Manage friends"
          >
            👥 Friends
          </button>
          <button className="profile-button" onClick={() => setIsProfileDialogOpen(true)}>
            Profile
          </button>
        </div>
      </header>

      {currentView === 'habits' && (
        <div className="habits-container">
          <div className="habits-header">
            <div className="habits-header-left">
              <button
                className="create-habit-button"
                onClick={() => {
                  if (!hasPaid && habits.length >= 2) {
                    setIsPricingModalOpen(true);
                  } else {
                    setIsCreateDialogOpen(true);
                  }
                }}
              >
                Create New Habit
              </button>
            </div>
            <div className="habits-header-controls">
              {showUserPoints && hasPaid && (
                <div className="global-stats">
                  <div className="global-points">
                    <span className="points-icon">⭐</span>
                    <span className="points-value">{overallStats.totalPoints.toLocaleString()}</span>
                    <span className="points-label">points</span>
                  </div>
                </div>
              )}
              <div className="calendar-view-toggle">
                <button
                  className={`view-toggle-btn ${calendarViewMode === 'year' ? 'active' : ''}`}
                  onClick={() => setCalendarViewMode('year')}
                  title="Calendar Year View"
                >
                  📅 Year
                </button>
                <button
                  className={`view-toggle-btn ${calendarViewMode === '365days' ? 'active' : ''}`}
                  onClick={() => setCalendarViewMode('365days')}
                  title="Past 365 Days View"
                >
                  📊 365 Days
                </button>
              </div>
              <div className="habit-search-container">
                <input
                  type="text"
                  placeholder="Search habits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="habit-search-input"
                />
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredHabits.map(habit => habit.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="habits-grid">
                {filteredHabits.length > 0 ? (
                  filteredHabits.map((habit) => (
                    <div key={habit.id} data-habit-id={habit.id}>
                      <HabitCard
                        habit={habit}
                        onComplete={handleCompleteHabit}
                        onDelete={handleDeleteHabit}
                        onEdit={handleEditHabit}
                        onPlan={handlePlanHabit}
                        onArchive={handleArchiveHabit}
                        viewMode={calendarViewMode}
                        isPremium={hasPaid}
                        onEditDialogChange={(isOpen) => handleEditDialogChange(habit.id, isOpen)}
                        onDeleteDialogChange={(isOpen) => handleDeleteDialogChange(habit.id, isOpen)}
                        onLogProgressDialogChange={(isOpen) => handleLogProgressDialogChange(habit.id, isOpen)}
                        onMoreMenuChange={(isOpen) => handleMoreMenuChange(habit.id, isOpen)}
                      />
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="no-results">
                    <p>No habits found matching "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="no-habits">
                    <p>No habits yet. Create your first habit to get started!</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <DraggablePlannerWidget session={session} onRefresh={plannerRefreshTrigger} onHabitClick={handleHabitClick} />

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
                <div className="form-group">
                  <label>Tracking Type</label>
                  <div className="tracking-type-toggle">
                    <button
                      type="button"
                      className={`tracking-option ${!isQuantifiable ? 'active' : ''}`}
                      onClick={() => setIsQuantifiable(false)}

                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      className={`tracking-option ${isQuantifiable ? 'active' : ''}`}
                      onClick={() => setIsQuantifiable(true)}

                    >
                      Numerical
                    </button>
                  </div>
                  <p className="tracking-type-description">
                    Choose between simple or numerical logging
                  </p>
                </div>
                {isQuantifiable && (
                  <>
                    <div className="form-group">
                      <label htmlFor="target-value">Daily Target</label>
                      <input
                        id="target-value"
                        type="number"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        placeholder="e.g., 8, 30, 2"
                        min="0"
                        step="0.1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="metric-unit">Unit of Measurement</label>
                      <input
                        id="metric-unit"
                        type="text"
                        value={metricUnit}
                        onChange={(e) => setMetricUnit(e.target.value)}
                        placeholder="e.g., times, minutes, pages, cups"
                        required
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Privacy Setting</label>
                  <div className="privacy-toggle">
                    <button
                      type="button"
                      className={`privacy-option ${!isPrivate ? 'active' : ''}`}
                      onClick={() => setIsPrivate(false)}

                    >
                      Public
                    </button>
                    <button
                      type="button"
                      className={`privacy-option ${isPrivate ? 'active' : ''}`}
                      onClick={() => setIsPrivate(true)}

                    >
                      Private
                    </button>
                  </div>
                  <p className="privacy-description">
                    Private habits are only visible to you. Public habits can be viewed by other users
                  </p>
                </div>
                            <div className="form-group">
              <label>Insights</label>
              <div className="insights-toggle">
                <button
                  type="button"
                  className={`insights-option ${!hasInsights ? 'active' : ''}`}
                  onClick={() => setHasInsights(false)}
                >
                  Disabled
                </button>
                <button
                  type="button"
                  className={`insights-option ${hasInsights ? 'active' : ''}`}
                  onClick={() => setHasInsights(true)}
                >
                  Enabled
                </button>
              </div>
              <p className="insights-description">
                Get powerful analytics including streaks, trends, and ranked progression
              </p>
              {hasInsights && (
                <div className="insight-settings">
                  <p className="insight-settings-label">Choose which insights to display:</p>
                  <div className="insight-checkboxes">
                    <label className="insight-checkbox-label">
                      <input
                        type="checkbox"
                        checked={insightSettings.showCurrentStreak}
                        onChange={(e) => setInsightSettings(prev => ({
                          ...prev,
                          showCurrentStreak: e.target.checked
                        }))}
                      />
                      <span>Current Streak</span>
                    </label>
                    <label className="insight-checkbox-label">
                      <input
                        type="checkbox"
                        checked={insightSettings.showTotalDays}
                        onChange={(e) => setInsightSettings(prev => ({
                          ...prev,
                          showTotalDays: e.target.checked
                        }))}
                      />
                      <span>Total Completions</span>
                    </label>
                    <label className="insight-checkbox-label">
                      <input
                        type="checkbox"
                        checked={insightSettings.showProgressBar}
                        onChange={(e) => setInsightSettings(prev => ({
                          ...prev,
                          showProgressBar: e.target.checked
                        }))}
                      />
                      <span>Rank Progress Bar</span>
                    </label>
                  </div>
                </div>
              )}

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
                        </div>
                      ) : (
                        <div className="username-display">
                          <h3>
                            {username || 'No username set'}
                            <button 
                              className="edit-username-btn"
                              onClick={handleStartEditingUsername}
                              title="Edit username"
                            >
                              ✏️
                            </button>
                          </h3>
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


              </div>
            </Dialog.Description>
            <div className="dialog-buttons">
              <button 
                onClick={() => {
                  setIsProfileDialogOpen(false);
                  setIsDeleteAccountDialogOpen(true);
                }}
                className="delete-account-button"
              >
                Delete Account
              </button>
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

      <Dialog.Root open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content delete-account-dialog">
            <Dialog.Title>Delete Account</Dialog.Title>
            <Dialog.Description>
              <div className="delete-account-content">
                <p><strong>⚠️ This action cannot be undone!</strong></p>
                <p>Deleting your account will permanently remove:</p>
                <ul>
                  <li>All your habits and progress data</li>
                  <li>Your user profile and username</li>
                  <li>All completion history</li>
                  <li>Your premium status (if applicable)</li>
                </ul>
                <p>Are you absolutely sure you want to delete your account?</p>
              </div>
            </Dialog.Description>
            <div className="dialog-buttons">
              <button 
                onClick={handleDeleteAccount}
                className="delete-confirm-button"
              >
                Yes, Delete My Account
              </button>
              <button onClick={() => setIsDeleteAccountDialogOpen(false)}>
                Cancel
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <React.Suspense fallback={<div style={{ display: 'none' }}></div>}>
        <Friends 
          session={session}
          isOpen={isFriendsDialogOpen}
          onClose={() => setIsFriendsDialogOpen(false)}
        />
      </React.Suspense>

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

      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        onSelectPlan={handleSelectPlan}
        isLoading={isPaymentLoading}
      />

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-copyright">
            © 2025 BuildHabits. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainPage; 

