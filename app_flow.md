# Aruvi Play - Full App Flow

This document outlines the complete navigation structure, user flows, and feature access controls in the Aruvi Play mobile application.

---

## 1. App Startup & Initialization (`app/_layout.tsx`)
When the app launches, it performs the following background tasks:
1. **Initialize Audio Player**: Sets up `react-native-track-player`.
2. **Hydrate Auth State**: Checks for an existing Supabase authenticated session.
3. **Check for Updates**: Pings the update service (if configured).

> [!IMPORTANT]
> The app employs strict route guards. If a user attempts to access a protected route without authentication, they are immediately redirected to the Auth screen.

---

## 2. Authentication Screen (`app/auth.tsx`)
If no valid session is found on startup, the user is presented with the Login screen. This is the central gateway to the app.

**Available Actions:**
- **Log In**: Enter email and password to access the authenticated app.
- **Sign Up**: Create a new account with email and password.
- **Forgot Password**: Send a password reset email.
- **Continue as Guest**: Enters a restricted, local-only mode instantly without creating a temporary account.

---

## 3. The Two User Modes

The application dynamically adapts its UI and available features based on the `authMode` state (`"guest"` vs `"authenticated"`).

### A. Guest Mode Flow
Guest mode is designed for quick, ephemeral listening. It does not save data across app restarts.

**Navigation Tabs:**
1. **Home (`index.tsx`)**: 
   - Displays Trending Hits and Search Categories.
   - Shows "Current Queue" shortcut.
   - Profile Avatar is visible, allowing access to the Profile tab.
   - *Hidden*: "Recently Played", "Recommended", "Music Rooms" shortcut.
2. **Search (`search.tsx`)**: 
   - Search for songs and play them.
   - *Hidden*: The "Heart" (like) button on all song rows.
3. **Queue (`queue.tsx`)**: 
   - View and manage the current local playback queue.
4. **Profile (`profile.tsx`)**:
   - View guest status.
   - Options to Save Account (upgrade to registered) or Logout of the guest session.
   - *Hidden*: Edit Profile functionality.

**Guest Restrictions:**
- Closing the app destroys the guest session. Reopening goes back to the Auth screen.
- Deep linking or navigating to `/library`, `/rooms`, `/profile`, or `/playlists` results in a silent redirect to the Auth screen.
- No ability to like songs, create playlists, or join synchronized music rooms.

### B. Authenticated User Flow
Authenticated users have full access to the application's ecosystem, with data persisted in Supabase.

**Navigation Tabs:**
1. **Home (`index.tsx`)**: 
   - Full dashboard including "Recently Played", "Recommended for You" (with like buttons), and quick access to "Liked Songs", "Playlists", and "Downloads".
   - Top-right Profile Avatar is visible.
2. **Search (`search.tsx`)**: 
   - Search for songs.
   - Can "Like" songs directly from search results.
3. **Library (`library.tsx`)**: 
   - Access to Liked Songs (synced with Supabase), user-created Playlists, and local device downloads.
4. **Rooms (`rooms.tsx`)**: 
   - Access to real-time synchronized music rooms.
   - Create a new room (generates a code).
   - Join an existing room via code.
5. **Profile (`profile.tsx`)**: 
   - Manage account settings, edit display name, toggle theme/appearance, and adjust playback settings.
   - Log out functionality.

---

## 4. Core Features (Available to All)

### Mini Player (`components/MiniPlayer.tsx`)
- Appears floating above the bottom tab bar whenever a song is loaded.
- Shows current song title, artist, artwork, play/pause, and next button.
- Tapping it opens the Full Player.

### Full Player (`app/player.tsx`)
- Presented as a modal sliding up from the bottom.
- Large artwork display, progress scrubber, play/pause, skip next/prev.
- (Authenticated only) Heart button to like the current song.
- Queue button to view upcoming tracks.

### Background Playback
- Music continues playing when the app is backgrounded or the screen is locked, managed via native OS media controls.

---

## 5. Security & Database Flow (Supabase)
- **Authentication**: Handled via Supabase Auth (Email/Password).
- **Database (PostgreSQL)**:
  - `profiles`: Stores user metadata (display name, avatar).
  - `liked_songs` & `playlists`: Synced user library data.
  - `rooms`, `room_members`, `room_queue`, `room_actions`: Real-time multiplayer data.
- **Row Level Security (RLS)**: 
  - Strict policies ensure that `(auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE`.
  - Only fully authenticated users can read or write to `rooms`, `profiles`, or `liked_songs`. Guests are blocked at the database level.
