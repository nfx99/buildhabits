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
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [friendStatus, setFriendStatus] = useState('none'); // 'none', 'friend', 'pending', 'incoming'
  const [isOwnProfile, setIsOwnProfile] = useState(false);

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

  const checkFriendStatus = useCallback(async () => {
    if (!session || !userId) return;
    
    // Check if this is the user's own profile
    if (session.user.id === userId) {
      setIsOwnProfile(true);
      setFriendStatus('own');
      return;
    }

    try {
      // Check if they are friends
      const { data: friendship, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${session.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${session.user.id})`)
        .maybeSingle();

      if (error) throw error;

      if (friendship) {
        if (friendship.status === 'accepted') {
          setFriendStatus('friend');
        } else if (friendship.user_id === session.user.id) {
          setFriendStatus('pending');
        } else {
          setFriendStatus('incoming');
        }
      } else {
        setFriendStatus('none');
      }
    } catch (error) {
      console.error('Error checking friend status:', error);
      setFriendStatus('none');
    }
  }, [session, userId]);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      await Promise.all([fetchUserProfile(), fetchUserHabits(), checkFriendStatus()]);
      setLoading(false);
    };

    if (userId) {
      loadUserData();
    }
  }, [userId, fetchUserProfile, fetchUserHabits, checkFriendStatus]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleShareProfile = async () => {
    try {
      const profileUrl = window.location.href;
      await navigator.clipboard.writeText(profileUrl);
      setShowShareSuccess(true);
      
      // Reset share success state after 2 seconds
      setTimeout(() => {
        setShowShareSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: session.user.id,
            friend_id: userId,
            status: 'pending'
          }
        ]);

      if (error) throw error;
      setFriendStatus('pending');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const acceptFriendRequest = async () => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', userId)
        .eq('friend_id', session.user.id);

      if (error) throw error;
      setFriendStatus('friend');
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const rejectFriendRequest = async () => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', session.user.id);

      if (error) throw error;
      setFriendStatus('none');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const removeFriend = async () => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${session.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${session.user.id})`);

      if (error) throw error;
      setFriendStatus('none');
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const cancelPendingRequest = async () => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', session.user.id)
        .eq('friend_id', userId);

      if (error) throw error;
      setFriendStatus('none');
    } catch (error) {
      console.error('Error canceling pending request:', error);
    }
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
        <div className="header-actions">
          {!isOwnProfile && (
            <div className="friend-action">
              {friendStatus === 'none' && (
                <button 
                  className="add-friend-btn"
                  onClick={sendFriendRequest}
                  title="Add as friend"
                >
                  👥 Add Friend
                </button>
              )}
              {friendStatus === 'pending' && (
                <button 
                  className="cancel-request-btn"
                  onClick={cancelPendingRequest}
                  title="Cancel friend request"
                >
                  ⏳ Cancel Request
                </button>
              )}
              {friendStatus === 'incoming' && (
                <div className="friend-request-actions">
                  <button 
                    className="accept-friend-btn"
                    onClick={acceptFriendRequest}
                    title="Accept friend request"
                  >
                    ✓ Accept
                  </button>
                  <button 
                    className="reject-friend-btn"
                    onClick={rejectFriendRequest}
                    title="Reject friend request"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
              {friendStatus === 'friend' && (
                <button 
                  className="remove-friend-btn"
                  onClick={removeFriend}
                  title="Remove friend"
                >
                  👥 Friends
                </button>
              )}
            </div>
          )}
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
                isPremium={true}
                viewMode="year"
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