import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { getDefaultAvatarUrl } from '../utils/profilePictureUpload';
import * as Dialog from '@radix-ui/react-dialog';
import './Friends.css';

const Friends = ({ session, isOpen, onClose }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add'
  const [loading, setLoading] = useState(true);

  // Fetch user details for a given user ID
  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, profile_picture_url')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user details:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }, []);

  // Fetch friends list with user details
  const fetchFriends = useCallback(async () => {
    try {
      console.log('Fetching friends for user:', session.user.id);
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);

      if (error) {
        console.error('Supabase error fetching friends:', error);
        throw error;
      }
      console.log('Friends data:', data);
      
      // Fetch user details for each friend and normalize the data
      const friendsWithDetails = await Promise.all(
        (data || []).map(async (friendship) => {
          // Determine which user is the friend (not the current user)
          const friendId = friendship.user_id === session.user.id 
            ? friendship.friend_id 
            : friendship.user_id;
          
          const userDetails = await fetchUserDetails(friendId);
          return {
            ...friendship,
            friend_id: friendId, // Normalize to always have friend_id as the other user
            friend: userDetails
          };
        })
      );
      
      setFriends(friendsWithDetails);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [session.user.id, fetchUserDetails]);

  // Fetch incoming friend requests
  const fetchFriendRequests = useCallback(async () => {
    try {
      console.log('Fetching friend requests for user:', session.user.id);
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', session.user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Supabase error fetching friend requests:', error);
        throw error;
      }
      console.log('Friend requests data:', data);
      
      // Fetch user details for each requester
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (friendship) => {
          const userDetails = await fetchUserDetails(friendship.user_id);
          return {
            ...friendship,
            requester: userDetails
          };
        })
      );
      
      setFriendRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  }, [session.user.id, fetchUserDetails]);

  // Fetch outgoing friend requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      console.log('Fetching pending requests for user:', session.user.id);
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Supabase error fetching pending requests:', error);
        throw error;
      }
      console.log('Pending requests data:', data);
      
      // Fetch user details for each friend
      const pendingWithDetails = await Promise.all(
        (data || []).map(async (friendship) => {
          const userDetails = await fetchUserDetails(friendship.friend_id);
          return {
            ...friendship,
            friend: userDetails
          };
        })
      );
      
      setPendingRequests(pendingWithDetails);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, [session.user.id, fetchUserDetails]);

  // Search for users to add as friends
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, profile_picture_url')
        .not('username', 'is', null)
        .ilike('username', `%${query}%`)
        .neq('user_id', session.user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [session.user.id]);

  // Send friend request
  const sendFriendRequest = async (friendId) => {
    try {
      console.log('Sending friend request from', session.user.id, 'to', friendId);
      const { data, error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: session.user.id,
            friend_id: friendId,
            status: 'pending'
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error sending friend request:', error);
        throw error;
      }
      
      console.log('Friend request sent successfully:', data);
      
      // Refresh pending requests
      await fetchPendingRequests();
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId) => {
    try {
      console.log('Accepting friend request with ID:', friendshipId);
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .select();

      if (error) {
        console.error('Supabase error accepting friend request:', error);
        throw error;
      }
      
      console.log('Friend request accepted successfully:', data);
      
      // Refresh friends and requests
      await Promise.all([fetchFriends(), fetchFriendRequests()]);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      
      // Refresh requests
      await fetchFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      
      // Refresh friends
      await fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Cancel pending request
  const cancelPendingRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      
      // Refresh pending requests
      await fetchPendingRequests();
    } catch (error) {
      console.error('Error canceling pending request:', error);
    }
  };

  // Get profile image URL with fallback to default avatar
  const getProfileImageUrl = (user) => {
    if (user?.profile_picture_url) {
      return user.profile_picture_url;
    }
    return getDefaultAvatarUrl(user?.username);
  };

  // Check if user is already a friend or has pending request
  const getFriendStatus = (userId) => {
    const isFriend = friends.some(f => f.friend_id === userId);
    const hasPendingRequest = pendingRequests.some(f => f.friend_id === userId);
    const hasIncomingRequest = friendRequests.some(f => f.user_id === userId);
    
    if (isFriend) return 'friend';
    if (hasPendingRequest) return 'pending';
    if (hasIncomingRequest) return 'incoming';
    return 'none';
  };

  // Handle search submission
  const handleSearch = () => {
    searchUsers(searchQuery);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchPendingRequests()
      ]);
      setLoading(false);
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, fetchFriends, fetchFriendRequests, fetchPendingRequests]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content friends-dialog">
          <Dialog.Title>Friends</Dialog.Title>
          
          <div className="friends-tabs">
            <button
              className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Friends ({friends.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Requests ({friendRequests.length + pendingRequests.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              Add Friends
            </button>
          </div>

          <div className="friends-content">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                {activeTab === 'friends' && (
                  <div className="friends-list">
                    {friends.length > 0 ? (
                      friends.map((friendship) => (
                        <div key={friendship.id} className="friend-item">
                          <div className="friend-info">
                            <div className="friend-avatar">
                              <img
                                src={getProfileImageUrl(friendship.friend)}
                                alt={`${friendship.friend?.username}'s profile`}
                                className="avatar-image"
                              />
                            </div>
                            <div className="friend-details">
                              <div className="friend-name">{friendship.friend?.username}</div>
                              <div className="friend-status">Friend</div>
                            </div>
                          </div>
                          <div className="friend-actions">
                            <button
                              className="view-profile-btn"
                              onClick={() => {
                                onClose();
                                window.location.href = `/user/${friendship.friend_id}`;
                              }}
                            >
                              View Profile
                            </button>
                            <button
                              className="remove-friend-btn"
                              onClick={() => removeFriend(friendship.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-friends">
                        <p>No friends yet. Add some friends to see their habits!</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div className="requests-list">
                    {/* Incoming Friend Requests */}
                    <div className="requests-section">
                      <h4 className="section-title">
                        Incoming Requests ({friendRequests.length})
                      </h4>
                      {friendRequests.length > 0 ? (
                        friendRequests.map((request) => (
                          <div key={request.id} className="request-item incoming">
                            <div className="request-info">
                              <div className="request-avatar">
                                <img
                                  src={getProfileImageUrl(request.requester)}
                                  alt={`${request.requester?.username}'s profile`}
                                  className="avatar-image"
                                />
                              </div>
                              <div className="request-details">
                                <div className="request-name">{request.requester?.username}</div>
                                <div className="request-status">Wants to be your friend</div>
                              </div>
                            </div>
                            <div className="request-actions">
                              <button
                                className="accept-btn"
                                onClick={() => acceptFriendRequest(request.id)}
                              >
                                Accept
                              </button>
                              <button
                                className="reject-btn"
                                onClick={() => rejectFriendRequest(request.id)}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-requests">
                          <p>No incoming friend requests.</p>
                        </div>
                      )}
                    </div>

                    {/* Sent Friend Requests */}
                    <div className="requests-section">
                      <h4 className="section-title">
                        Sent Requests ({pendingRequests.length})
                      </h4>
                      {pendingRequests.length > 0 ? (
                        pendingRequests.map((request) => (
                          <div key={request.id} className="request-item pending">
                            <div className="request-info">
                              <div className="request-avatar">
                                <img
                                  src={getProfileImageUrl(request.friend)}
                                  alt={`${request.friend?.username}'s profile`}
                                  className="avatar-image"
                                />
                              </div>
                              <div className="request-details">
                                <div className="request-name">{request.friend?.username}</div>
                                <div className="request-status">Request sent • Waiting for response</div>
                              </div>
                            </div>
                            <div className="request-actions">
                              <button
                                className="cancel-btn"
                                onClick={() => cancelPendingRequest(request.id)}
                              >
                                Cancel Request
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-requests">
                          <p>No sent friend requests.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'add' && (
                  <div className="add-friends">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search for users..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (!e.target.value.trim()) {
                            setHasSearched(false);
                            setSearchResults([]);
                          }
                        }}
                        onKeyDown={handleKeyPress}
                        className="search-input"
                      />
                      <button 
                        className="search-icon-btn"
                        onClick={handleSearch}
                        title="Search"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="search-icon">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="search-results">
                      {isSearching ? (
                        <div className="search-loading">Searching...</div>
                      ) : hasSearched && searchResults.length > 0 ? (
                        searchResults.map((user) => {
                          const status = getFriendStatus(user.user_id);
                          return (
                            <div key={user.user_id} className="search-result">
                              <div className="result-info">
                                <div className="result-avatar">
                                  <img
                                    src={getProfileImageUrl(user)}
                                    alt={`${user.username}'s profile`}
                                    className="avatar-image"
                                  />
                                </div>
                                <div className="result-details">
                                  <div className="result-name">{user.username}</div>
                                  <div className="result-status">
                                    {status === 'friend' && 'Already friends'}
                                    {status === 'pending' && 'Request sent'}
                                    {status === 'incoming' && 'Request received'}
                                    {status === 'none' && 'Not friends'}
                                  </div>
                                </div>
                              </div>
                              <div className="result-actions">
                                {status === 'none' && (
                                  <button
                                    className="add-friend-btn"
                                    onClick={() => sendFriendRequest(user.user_id)}
                                  >
                                    Add Friend
                                  </button>
                                )}
                                {status === 'incoming' && (
                                  <div className="request-buttons">
                                    <button
                                      className="accept-btn"
                                      onClick={() => {
                                        const request = friendRequests.find(r => r.user_id === user.user_id);
                                        if (request) acceptFriendRequest(request.id);
                                      }}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      className="reject-btn"
                                      onClick={() => {
                                        const request = friendRequests.find(r => r.user_id === user.user_id);
                                        if (request) rejectFriendRequest(request.id);
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {status === 'pending' && (
                                  <button
                                    className="cancel-btn"
                                    onClick={() => {
                                      const request = pendingRequests.find(r => r.friend_id === user.user_id);
                                      if (request) cancelPendingRequest(request.id);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                )}
                                {status === 'friend' && (
                                  <button
                                    className="view-profile-btn"
                                    onClick={() => {
                                      onClose();
                                      window.location.href = `/user/${user.user_id}`;
                                    }}
                                  >
                                    View Profile
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : hasSearched && searchQuery ? (
                        <div className="no-results">No users found</div>
                      ) : (
                        <div className="search-placeholder">
                          <p>Search for users to add as friends</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="dialog-buttons">
            <button onClick={onClose}>Close</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Friends; 