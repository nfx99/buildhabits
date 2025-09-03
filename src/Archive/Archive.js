import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import { getBackgroundImageStyles } from '../utils/backgroundImageUpload';
import { getButtonStyles } from '../utils/themeCustomization';
import './Archive.css';
import { useNavigate } from 'react-router-dom';

const Archive = ({ session }) => {
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [userTheme, setUserTheme] = useState(null);
  const navigate = useNavigate();

  const checkPremiumStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_premium, background_image_url, theme_customization')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking premium status:', error);
        setIsPremium(false);
      } else {
        setIsPremium(data?.is_premium || false);
        setBackgroundImageUrl(data?.background_image_url || '');
        setUserTheme(data?.theme_customization || null);
      }
    } catch (error) {
      console.error('Premium status check error:', error);
      setIsPremium(false);
    } finally {
      setPremiumLoading(false);
    }
  }, [session.user.id]);

  const fetchArchivedHabits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select(`
          *,
          habit_completions!fk_habit_completions_habit_id(*)
        `)
        .eq('user_id', session.user.id)
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setArchivedHabits(data || []);
    } catch (error) {
      console.error('fetchArchivedHabits error:', error);
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  useEffect(() => {
    if (isPremium) {
      fetchArchivedHabits();
    }
  }, [fetchArchivedHabits, isPremium]);

  const handleUnarchiveHabit = async (habitId) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ 
          is_archived: false,
          archived_at: null
        })
        .eq('id', habitId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setArchivedHabits(prev => prev.filter(habit => habit.id !== habitId));
    } catch (error) {
      console.error('Error unarchiving habit:', error);
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

      // Remove from local state
      setArchivedHabits(prev => prev.filter(habit => habit.id !== habitId));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const handleEditHabit = async (habitId, editData) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update(editData)
        .eq('id', habitId);

      if (error) {
        throw error;
      }

      // Update local state
      setArchivedHabits(prev => 
        prev.map(habit => 
          habit.id === habitId 
            ? { ...habit, ...editData }
            : habit
        )
      );
    } catch (error) {
      console.error('Error editing habit:', error);
    }
  };

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
        throw error;
      }
    } catch (error) {
      console.error('Error planning habit:', error);
    }
  };

  // Filter habits based on search query
  const filteredHabits = archivedHabits.filter(habit =>
    habit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (premiumLoading) {
    return (
      <div style={getBackgroundImageStyles(backgroundImageUrl)}>
        <div className="archive-container">
        </div>
      </div>
    );
  }

    if (!isPremium) {
    return (
      <div style={getBackgroundImageStyles(backgroundImageUrl)}>
        {userTheme && (
          <button 
            className="back-button"
            onClick={() => navigate('/')}
            title="Back to main page"
            style={{ 
              position: 'absolute', 
              top: '4rem', 
              left: '2rem', 
              zIndex: 100,
              ...getButtonStyles(userTheme)
            }}
          >
            ← Back to Home
          </button>
        )}
        <div className="archive-container">
          <h1 className="archive-title">Premium Feature</h1>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Archive is a premium feature.</p>
            <p>Upgrade to access your archived habits.</p>
            <button 
              className="upgrade-button"
              onClick={() => navigate('/')}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem', 
                marginTop: '1rem',
                cursor: 'pointer'
              }}
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={getBackgroundImageStyles(backgroundImageUrl)}>
        <div className="archive-container">
        </div>
      </div>
    );
  }

  return (
    <div style={getBackgroundImageStyles(backgroundImageUrl)}>
      {userTheme && (
        <button 
          className="back-button"
          onClick={() => navigate('/')}
          title="Back to main page"
          style={{ 
            position: 'absolute', 
            top: '4rem', 
            left: '2rem', 
            zIndex: 100,
            ...getButtonStyles(userTheme)
          }}
        >
          ← Back to Home
        </button>
      )}
      <div className="archive-container">
        <h1 className="archive-title">Archived Habits</h1>
        <div className="archive-search-bar">
          <input
            type="text"
            placeholder="Search archived habits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="habit-search-input"
          />
        </div>
        <div className="archived-habits-container">
          {filteredHabits.length > 0 ? (
            <div className="archived-habits-grid">
              {filteredHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onDelete={handleDeleteHabit}
                  onUnarchive={handleUnarchiveHabit}
                  onEdit={handleEditHabit}
                  onPlan={handlePlanHabit}
                  isReadOnly={false}
                  isArchived={true}
                  isPremium={true}
                  viewMode="year"
                />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="no-results">
              <p>No archived habits found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="no-archived-habits">
              <p>No archived habits yet.</p>
              <p>Archive habits you no longer want to track actively.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive; 