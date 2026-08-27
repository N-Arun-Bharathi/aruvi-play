import React, { useState, useEffect } from "react";
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
  const [activeView, setActiveView] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const { authMode, userProfile, loading, hydrate: hydrateAuth } = useAuthStore();
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
          <p className="text-sm font-semibold text-zinc-400">Loading Aruvi Play Web...</p>
        </div>
      </div>
    );
  }

  // Force Mandatory Login Screen for Unauthenticated Visitors
  if (authMode !== "authenticated" || !userProfile || userProfile.is_guest) {
    return (
      <div className="flex h-screen bg-zinc-950 text-white items-center justify-center p-4">
        <ToastContainer />
        <AuthModal isMandatory={true} />
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (activeView) {
      case "home":
        return <HomeView setActiveView={setActiveView} />;
      case "search":
        return <SearchView initialQuery={searchQuery} />;
      case "library":
        return <LibraryView initialTab="liked" setActiveView={setActiveView} />;
      case "liked":
        return <LibraryView initialTab="liked" setActiveView={setActiveView} />;
      case "playlists":
        return <LibraryView initialTab="playlists" setActiveView={setActiveView} />;
      case "playlist-detail":
        return <PlaylistDetailView setActiveView={setActiveView} />;
      case "history":
        return <LibraryView initialTab="history" setActiveView={setActiveView} />;
      case "rooms":
        return <RoomsView setActiveView={setActiveView} />;
      case "room-detail":
        return <RoomDetailView setActiveView={setActiveView} />;
      case "profile":
        return <ProfileView setActiveView={setActiveView} />;
      case "settings":
        return <SettingsView />;
      default:
        return <HomeView setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden antialiased">
      {/* Toast Alerts */}
      <ToastContainer />

      {/* Optional Dialogs */}
      <AuthModal />

      {/* Full Player Modal */}
      <FullPlayerModal onOpenQueue={() => setIsQueueOpen(true)} />

      {/* Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Left Desktop Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header */}
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          onSearchChange={(q) => setSearchQuery(q)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {renderCurrentView()}
        </main>

        {/* Persistent Bottom Mini Player */}
        <Player onOpenQueue={() => setIsQueueOpen(true)} />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
    </div>
  );
}

export default App;
