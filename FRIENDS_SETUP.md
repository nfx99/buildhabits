# Friends Feature Setup Guide

This guide explains how to set up the friends feature for the BuildHabits app.

## Database Setup

### 1. Run the Migration

Execute the SQL migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database/friends_migration.sql
```

This will create:
- `friendships` table with proper relationships
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates

### 2. Verify the Setup

After running the migration, you should see:
- A new `friendships` table in your database
- RLS policies enabled
- Proper foreign key relationships to `auth.users`

## Features Implemented

### 1. Friends Management Dialog
- **Access**: Click the "👥 Friends" button in the header
- **Tabs**:
  - **Friends**: View current friends and remove them
  - **Requests**: Accept/reject incoming requests, cancel outgoing requests
  - **Add Friends**: Search for users and send friend requests

### 2. User Profile Friend Actions
- **Add Friend**: Send a friend request to any user
- **Accept/Reject**: Handle incoming friend requests
- **Cancel Request**: Cancel pending outgoing requests
- **Remove Friend**: Remove existing friends
- **Friend Status**: Shows current relationship status

### 3. Friend Status Indicators
- **None**: No relationship
- **Pending**: Friend request sent (outgoing)
- **Incoming**: Friend request received
- **Friend**: Accepted friendship
- **Own**: Viewing your own profile

## Key Components

### Friends Component (`src/Friends/Friends.js`)
- Main friends management interface
- Tabbed interface for different friend operations
- Search functionality for finding users
- Real-time status updates

### UserProfile Updates (`src/UserProfile/UserProfile.js`)
- Friend status checking
- Friend action buttons
- Dynamic UI based on relationship status

### MainPage Integration (`src/MainPage/MainPage.js`)
- Friends button in header
- Lazy-loaded Friends dialog
- Toast notifications for actions

## Database Schema

```sql
friendships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  friend_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, friend_id)
)
```

## Security Features

- **Row Level Security (RLS)**: Users can only access their own friendships
- **Input Validation**: Status field restricted to valid values
- **Cascade Deletes**: Friendships removed when users are deleted
- **Unique Constraints**: Prevents duplicate friend relationships

## Usage Examples

### Adding a Friend
1. Click "👥 Friends" in the header
2. Go to "Add Friends" tab
3. Search for a username
4. Click "Add Friend"

### Accepting a Friend Request
1. Click "👥 Friends" in the header
2. Go to "Requests" tab
3. Click "Accept" next to the request

### Viewing a Friend's Profile
1. Go to "Friends" tab
2. Click "View Profile" next to a friend
3. Or visit `/user/{friend_id}` directly

## Mobile Responsiveness

The friends feature is fully responsive:
- Buttons stack vertically on mobile
- Touch-friendly button sizes
- Optimized layouts for small screens
- Friends button hidden on mobile to save space

## Error Handling

The feature includes comprehensive error handling:
- Network error recovery
- Invalid user handling
- Duplicate request prevention
- Graceful fallbacks for failed operations

## Future Enhancements

Potential improvements for the friends feature:
- Friend activity feed
- Friend suggestions
- Group habits/challenges
- Friend notifications
- Friend leaderboards
- Direct messaging 