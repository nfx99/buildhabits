import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import * as Dialog from '@radix-ui/react-dialog';
import './Friends.css';

const Friends = ({ session, isOpen, onClose }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add'
  const [loading, setLoading] = useState(true);

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:user_profiles!friendships_friend_id_fkey(
            user_id,
            username
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [session.user.id]);

  // Fetch incoming friend requests
  const fetchFriendRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:user_profiles!friendships_user_id_fkey(
            user_id,
            username
          )
        `)
        .eq('friend_id', session.user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  }, [session.user.id]);

  // Fetch outgoing friend requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:user_profiles!friendships_friend_id_fkey(
            user_id,
            username
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, [session.user.id]);

  // Search for users to add as friends
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username')
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
      const { error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: session.user.id,
            friend_id: friendId,
            status: 'pending'
          }
        ]);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      
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

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

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
              {friendRequests.length > 0 && (
                <span className="notification-badge">{friendRequests.length}</span>
              )}
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
                              {friendship.friend?.username?.[0]?.toUpperCase() || '👤'}
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
                                {request.requester?.username?.[0]?.toUpperCase() || '👤'}
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
                                {request.friend?.username?.[0]?.toUpperCase() || '👤'}
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    
                    <div className="search-results">
                      {isSearching ? (
                        <div className="search-loading">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((user) => {
                          const status = getFriendStatus(user.user_id);
                          return (
                            <div key={user.user_id} className="search-result">
                              <div className="result-info">
                                <div className="result-avatar">
                                  {user.username?.[0]?.toUpperCase() || '👤'}
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
                      ) : searchQuery ? (
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