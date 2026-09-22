import React, { useState, useEffect, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
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
import { PlaylistsView } from "./views/PlaylistsView";
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
import { usePlayerStore } from "./store/playerStore";

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const { loading, hydrate: hydrateAuth } = useAuthStore();
  const { hydrate: hydrateLiked } = useLikedStore();
  const { loadPlaylists, activePlaylist } = usePlaylistStore();
  const { loadHistory } = useHistoryStore();
  const { fetchActiveRooms, currentRoom } = useRoomStore();
  const { hydrate: hydratePlayer } = usePlayerStore();

  // Startup Hydration
  useEffect(() => {
    hydrateAuth();
    hydrateLiked();
    hydratePlayer();
    loadPlaylists();
    loadHistory();
    fetchActiveRooms();
  }, []);

  // Compute activeView from current URL path for Sidebar / Header highlights
  const activeView = useMemo(() => {
    const pathname = location.pathname;
    if (pathname === "/" || pathname === "/home") return "home";
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/playlists")) {
      return pathname === "/playlists" ? "playlists" : "playlist-detail";
    }
    if (pathname.startsWith("/library")) return "library";
    if (pathname.startsWith("/liked")) return "liked";
    if (pathname.startsWith("/history")) return "history";
    if (pathname.startsWith("/rooms")) {
      return pathname === "/rooms" ? "rooms" : "room-detail";
    }
    if (pathname.startsWith("/profile")) return "profile";
    if (pathname.startsWith("/settings")) return "settings";
    return "home";
  }, [location.pathname]);

  // Unified navigation helper that accepts both route paths and view IDs
  const handleNavigateView = (view: string) => {
    if (!view) return;
    if (view.startsWith("/")) {
      navigate(view);
      return;
    }

    switch (view) {
      case "home":
        navigate("/");
        break;
      case "search":
        navigate("/search");
        break;
      case "playlists":
        navigate("/playlists");
        break;
      case "playlist-detail": {
        const currentPl = usePlaylistStore.getState().activePlaylist;
        if (currentPl?.id) {
          navigate(`/playlists/${currentPl.id}`);
        } else {
          navigate("/playlists");
        }
        break;
      }
      case "library":
        navigate("/library");
        break;
      case "liked":
        navigate("/liked");
        break;
      case "history":
        navigate("/history");
        break;
      case "rooms":
        navigate("/rooms");
        break;
      case "room-detail": {
        const room = useRoomStore.getState().currentRoom;
        if (room?.id || room?.code) {
          navigate(`/rooms/${room.code || room.id}`);
        } else {
          navigate("/rooms");
        }
        break;
      }
      case "profile":
        navigate("/profile");
        break;
      case "settings":
        navigate("/settings");
        break;
      default:
        navigate(`/${view}`);
        break;
    }
  };

  // Show loading spinner during hydration
  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#0a0f1d] via-[#0f172a] to-[#131f38] items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <img src="/aruvi-play.png" alt="Aruvi Play" className="w-16 h-16 object-contain animate-pulse" />
          <p className="text-sm font-semibold text-slate-300">Loading Aruvi Play...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen text-slate-100 font-sans overflow-hidden antialiased relative bg-gradient-to-br from-[#0a0f1d] via-[#0f172a] to-[#131f38]">
      {/* Dynamic Ambient Electric Sky Blue & Royal Blue Blobs */}
      <div className="absolute -top-32 -left-32 w-[450px] h-[450px] bg-[#38bdf8]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 -right-24 w-[500px] h-[500px] bg-[#3b82f6]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-28 left-1/4 w-[600px] h-[600px] bg-[#6366f1]/12 rounded-full blur-[150px] pointer-events-none" />

      {/* Toast Alerts */}
      <ToastContainer />

      {/* Auth Modal */}
      <AuthModal />

      {/* Full Player Modal */}
      <FullPlayerModal onOpenQueue={() => setIsQueueOpen(true)} />

      {/* Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Left Desktop Sidebar */}
      <Sidebar activeView={activeView} setActiveView={handleNavigateView} />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {/* Top Header */}
        <Header
          activeView={activeView}
          setActiveView={handleNavigateView}
          onSearchChange={(q) => setSearchQuery(q)}
        />

        {/* Scrollable View Area with React Router Routes */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="pb-44">
            <Routes>
              <Route path="/" element={<HomeView setActiveView={handleNavigateView} />} />
              <Route path="/home" element={<HomeView setActiveView={handleNavigateView} />} />
              <Route path="/search" element={<SearchView initialQuery={searchQuery} />} />
              <Route path="/playlists" element={<PlaylistsView setActiveView={handleNavigateView} />} />
              <Route path="/playlists/:id" element={<PlaylistDetailView setActiveView={handleNavigateView} />} />
              <Route path="/library" element={<LibraryView initialTab="liked" setActiveView={handleNavigateView} />} />
              <Route path="/liked" element={<LibraryView initialTab="liked" setActiveView={handleNavigateView} />} />
              <Route path="/history" element={<LibraryView initialTab="history" setActiveView={handleNavigateView} />} />
              <Route path="/rooms" element={<RoomsView setActiveView={handleNavigateView} />} />
              <Route path="/rooms/:id" element={<RoomDetailView setActiveView={handleNavigateView} />} />
              <Route path="/profile" element={<ProfileView setActiveView={handleNavigateView} />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Persistent Bottom Mini Player */}
        <Player onOpenQueue={() => setIsQueueOpen(true)} />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav activeView={activeView} setActiveView={handleNavigateView} />
      </div>
    </div>
  );
}

export default App;

