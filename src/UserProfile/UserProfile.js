import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import './UserProfile.css';

const UserProfile = ({ session }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('User not found');
    }
  }, [userId]);

  const fetchUserHabits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select(`
          *,
          habit_completions!fk_habit_completions_habit_id(*)
        `)
        .eq('user_id', userId)
        .eq('is_private', false) // Only fetch public habits
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error fetching user habits:', error);
      setError('Error loading habits');
    }
  }, [userId]);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      await Promise.all([fetchUserProfile(), fetchUserHabits()]);
      setLoading(false);
    };

    if (userId) {
      loadUserData();
    }
  }, [userId, fetchUserProfile, fetchUserHabits]);

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return <div className="loading">Loading user profile...</div>;
  }

  if (error) {
    return (
      <div className="user-profile-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleBackToHome} className="back-button">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <header className="user-profile-header">
        <button onClick={handleBackToHome} className="back-button">
          ← Back to Home
        </button>
        <div className="user-info">
          <h1>{userProfile?.username || 'Unknown User'}</h1>
          <p className="user-stats">
            {habits.length} public habit{habits.length !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <div className="user-habits-container">
        {habits.length > 0 ? (
          <div className="user-habits-grid">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onComplete={() => {}} // Read-only for other users
                onDelete={() => {}} // Read-only for other users
                onEdit={() => {}} // Read-only for other users
                isReadOnly={true}
              />
            ))}
          </div>
        ) : (
          <div className="no-public-habits">
            <h3>No Public Habits</h3>
            <p>{userProfile?.username} hasn't shared any public habits yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 