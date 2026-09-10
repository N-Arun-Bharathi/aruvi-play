import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { Player } from "./components/Player";
import { FullPlayerModal } from "./components/FullPlayerModal";
import { QueueDrawer } from "./components/QueueDrawer";
import { AuthModal } from "./components/AuthModal";
import { ToastContainer } from "./components/ToastContainer";

import { HomeView } from "./views/HomeView";
import { SearchView } from "./views/SearchView";
import { LibraryView } from "./views/LibraryView";
import { PlaylistDetailView } from "./views/PlaylistDetailView";
import { RoomsView } from "./views/RoomsView";
import { RoomDetailView } from "./views/RoomDetailView";
import { ProfileView } from "./views/ProfileView";
import { SettingsView } from "./views/SettingsView";

import { useAuthStore } from "./store/authStore";
import { useLikedStore } from "./store/likedStore";
import { usePlaylistStore } from "./store/playlistStore";
import { useHistoryStore } from "./store/historyStore";
import { useRoomStore } from "./store/roomStore";

export function App() {
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const { loading, hydrate: hydrateAuth } = useAuthStore();
  const { hydrate: hydrateLiked } = useLikedStore();
  const { loadPlaylists } = usePlaylistStore();
  const { loadHistory } = useHistoryStore();
  const { fetchActiveRooms } = useRoomStore();

  // Startup Hydration
  useEffect(() => {
    hydrateAuth();
    hydrateLiked();
    loadPlaylists();
    loadHistory();
    fetchActiveRooms();
  }, []);

  // Show loading spinner during hydration
  if (loading) {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <img src="/aruvi-play.png" alt="Aruvi Play" className="w-16 h-16 object-contain animate-pulse" />
          <p className="text-sm font-semibold text-zinc-400">Loading Aruvi Play...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden antialiased">
      {/* Toast Alerts */}
      <ToastContainer />

      {/* Auth Modal */}
      <AuthModal />

      {/* Full Player Modal */}
      <FullPlayerModal onOpenQueue={() => setIsQueueOpen(true)} />

      {/* Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Left Desktop Sidebar */}
      <Sidebar />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header */}
        <Header />

        {/* Scrollable View Area with generous bottom padding for floating player pill */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="pb-44">
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/home" element={<HomeView />} />
              <Route path="/search" element={<SearchView />} />
              <Route path="/library" element={<LibraryView initialTab="liked" />} />
              <Route path="/library/liked" element={<LibraryView initialTab="liked" />} />
              <Route path="/library/playlists" element={<LibraryView initialTab="playlists" />} />
              <Route path="/library/history" element={<LibraryView initialTab="history" />} />
              <Route path="/playlists" element={<LibraryView initialTab="playlists" />} />
              <Route path="/playlist/:id" element={<PlaylistDetailView />} />
              <Route path="/rooms" element={<RoomsView />} />
              <Route path="/rooms/:code" element={<RoomDetailView />} />
              <Route path="/room/:code" element={<RoomDetailView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Persistent Bottom Mini Player */}
        <Player onOpenQueue={() => setIsQueueOpen(true)} />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default App;
