import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import HabitCard from '../components/HabitCard';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import { getDefaultAvatarUrl } from '../utils/profilePictureUpload';
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
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, profile_picture_url')
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
          habit_completions(*)
        `)
        .eq('user_id', userId)
        .eq('is_private', false) // Only fetch public habits
        .eq('is_archived', false) // Only fetch non-archived habits
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching habits:', error);
        throw error;
      }
      

      
      setHabits(data || []);
    } catch (error) {
      console.error('Error fetching user habits:', error);
      setError('Error loading habits');
    }
  }, [userId]);

  const checkFriendStatus = useCallback(async () => {
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

      if (error) {
        console.error('Supabase error checking friend status:', error);
        throw error;
      }

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
      console.log('Sending friend request from', session.user.id, 'to', userId);
      const { data, error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: session.user.id,
            friend_id: userId,
            status: 'pending'
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error sending friend request:', error);
        throw error;
      }
      
      console.log('Friend request sent successfully:', data);
      setFriendStatus('pending');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const acceptFriendRequest = async () => {
    try {
      console.log('Accepting friend request from', userId);
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', userId)
        .eq('friend_id', session.user.id)
        .select();

      if (error) {
        console.error('Supabase error accepting friend request:', error);
        throw error;
      }
      
      console.log('Friend request accepted successfully:', data);
      setFriendStatus('friend');
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const rejectFriendRequest = async () => {
    try {
      console.log('Rejecting friend request from', userId);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', session.user.id);

      if (error) {
        console.error('Supabase error rejecting friend request:', error);
        throw error;
      }
      
      console.log('Friend request rejected successfully');
      setFriendStatus('none');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const removeFriend = async () => {
    try {
      console.log('Removing friend relationship with', userId);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${session.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${session.user.id})`);

      if (error) {
        console.error('Supabase error removing friend:', error);
        throw error;
      }
      
      console.log('Friend removed successfully');
      setFriendStatus('none');
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const cancelPendingRequest = async () => {
    try {
      console.log('Canceling pending friend request to', userId);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', session.user.id)
        .eq('friend_id', userId);

      if (error) {
        console.error('Supabase error canceling pending request:', error);
        throw error;
      }
      
      console.log('Pending friend request canceled successfully');
      setFriendStatus('none');
    } catch (error) {
      console.error('Error canceling pending request:', error);
    }
  };

  const handleUploadSuccess = (newImageUrl, updatedProfile) => {
    setUserProfile(prevProfile => ({
      ...prevProfile,
      profile_picture_url: newImageUrl
    }));
    setUploadSuccess(true);
    setUploadError(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setUploadSuccess(false);
    }, 3000);
  };

  const handleUploadError = (errorMessage) => {
    setUploadError(errorMessage);
    setUploadSuccess(false);
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      setUploadError(null);
    }, 5000);
  };

  const getProfileImageUrl = () => {
    if (userProfile?.profile_picture_url) {
      return userProfile.profile_picture_url;
    }
    return getDefaultAvatarUrl(userProfile?.username);
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
          <div className="profile-picture-section">
            {/* Profile Picture Display */}
            {!isOwnProfile ? (
              <div className="profile-picture-display">
                <img
                  src={getProfileImageUrl()}
                  alt={`${userProfile?.username}'s profile`}
                  className="profile-image-readonly"
                />
              </div>
            ) : (
              <div className="profile-picture-upload-section">
                <ProfilePictureUpload
                  userId={session?.user?.id}
                  currentImageUrl={userProfile?.profile_picture_url}
                  username={userProfile?.username}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  disabled={!isOwnProfile}
                />
                
                {/* Upload feedback messages */}
                {uploadSuccess && (
                  <div className="upload-message success">
                    ✅ Profile picture updated successfully!
                  </div>
                )}
                {uploadError && (
                  <div className="upload-message error">
                    ❌ {uploadError}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="user-details">
            <h1>{userProfile?.username || 'Unknown User'}</h1>
            <p className="user-stats">
              {habits.length} public habit{habits.length !== 1 ? 's' : ''}
            </p>
          </div>
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
                  ⏳ Request Sent
                </button>
              )}
              {friendStatus === 'incoming' && (
                <button
                  className="incoming-request-btn"
                  disabled
                  title="You have an incoming friend request from this user. Please check your Friends tab."
                >
                  ✉️ Incoming Request
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