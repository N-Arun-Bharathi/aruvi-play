import { create } from "zustand";
import { Song, supabase, normalizeSongTitle } from "@aruvi/shared";
import { useToastStore } from "./toastStore";
import likedJson from "../assets/likedSongs.json";

interface LikedStoreState {
  likedSongs: Song[];
  loading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (songOrId: Song | string) => boolean;
  clearLiked: () => void;
}

const STORAGE_KEY = "aruvi_web_liked_songs";

const normalize = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const songsMatch = (s1: Song, s2: Song): boolean => {
  if (!s1 || !s2) return false;
  if (s1.id && s2.id && s1.id === s2.id) return true;

  const t1 = normalize(s1.title);
  const t2 = normalize(s2.title);
  if (!t1 || !t2) return false;

  if (t1 !== t2 && !t1.includes(t2) && !t2.includes(t1)) return false;

  const getArtists = (a: string) =>
    (a || "")
      .toLowerCase()
      .split(/[;,]/)
      .map((x) => normalize(x))
      .filter((x) => x.length > 2);

  const a1 = getArtists(s1.artist);
  const a2 = getArtists(s2.artist);

  if (a1.length === 0 || a2.length === 0) {
    return t1 === t2;
  }

  return a1.some((name1) =>
    a2.some((name2) => name1 === name2 || name1.includes(name2) || name2.includes(name1))
  );
};

function getAdminFormattedSeedSongs(): Song[] {
  if (!likedJson || !Array.isArray(likedJson)) return [];
  return (likedJson as any[]).map((s: any, i: number) => ({
    id: s.id || `json:${s.title}-${s.artist}-${i}`,
    title: s.title,
    artist: s.artist,
    album: s.album || "",
    artwork: s.artwork || "",
    url: s.url || "",
    duration: s.duration || 0,
    source: s.source || "online",
  }));
}

function loadInitialLiked(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // If active user in localStorage is admin, seed initial songs immediately
    const storedUserRaw = localStorage.getItem("aruvi_user_profile");
    if (storedUserRaw) {
      const storedUser = JSON.parse(storedUserRaw);
      const email = storedUser?.email?.toLowerCase().trim();
      if (email === "arunabi6483@gmail.com" || storedUser?.is_owner || storedUser?.isAdmin) {
        const seedSongs = getAdminFormattedSeedSongs();
        if (seedSongs.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSongs));
          } catch (e) {}
          return seedSongs;
        }
      }
    }
    return [];
  } catch (err) {
    return [];
  }
}

let realtimeChannel: any = null;
let focusListenerAttached = false;

export const useLikedStore = create<LikedStoreState>((set, get) => ({
  likedSongs: loadInitialLiked(),
  loading: false,
  hydrated: false,

  hydrate: async () => {
    // 1. Instant load from local storage
    const localLiked = loadInitialLiked();
    if (localLiked.length > 0) {
      set({ likedSongs: localLiked });
    }

    // 2. Attach focus & visibility change listeners once to keep tab synchronized
    if (typeof window !== "undefined" && !focusListenerAttached) {
      focusListenerAttached = true;
      window.addEventListener("focus", () => {
        get().hydrate().catch(() => {});
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          get().hydrate().catch(() => {});
        }
      });
    }

    // 3. Resolve current user profile
    let user = null;
    try {
      const storedUserRaw = localStorage.getItem("aruvi_user_profile");
      if (storedUserRaw) {
        user = JSON.parse(storedUserRaw);
      }
    } catch (e) {}

    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const session = sessionData?.session;
    const sessionUser = session?.user;

    const userEmail = (user?.email || sessionUser?.email || "").toLowerCase().trim();
    const userId = user?.id || sessionUser?.id;
    const isAdmin = userEmail === "arunabi6483@gmail.com" || user?.is_owner || user?.isAdmin || sessionUser?.user_metadata?.is_owner === true;

    // 4. Query live Supabase database
    try {
      if (userId && !user?.is_guest) {
        const { data: serverLikes, error } = await supabase
          .from("liked_songs")
          .select("song_id, liked_at, songs(*)")
          .eq("user_id", userId)
          .order("liked_at", { ascending: false });

        if (serverLikes && !error) {
          const serverSongs: Song[] = serverLikes
            .map((item: any) => {
              const s = item.songs;
              if (!s) return null;
              return {
                id: s.id,
                title: s.title,
                artist: s.artist || "",
                album: s.album || "",
                artwork: s.artwork_url || "",
                url: s.source_url || "",
                duration: s.duration_seconds || 0,
                source: s.source_type === "local" ? "local" : "online",
              } as Song;
            })
            .filter(Boolean) as Song[];

          if (serverSongs.length > 0) {
            set({ likedSongs: serverSongs, loading: false, hydrated: true });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSongs));
            } catch (e) {}
          } else if (isAdmin) {
            // Pre-seed admin liked songs from json
            const seedSongs = getAdminFormattedSeedSongs();
            set({ likedSongs: seedSongs, loading: false, hydrated: true });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSongs));
            } catch (e) {}

            // Background sync admin seed songs into Supabase database
            (async () => {
              try {
                for (let i = 0; i < seedSongs.length; i += 40) {
                  const chunk = seedSongs.slice(i, i + 40);
                  const songRecords = chunk.map((song) => ({
                    id: song.id,
                    title: song.title,
                    normalized_title: normalizeSongTitle(song.title) || song.title.toLowerCase().trim(),
                    artist: song.artist || "",
                    album: song.album || null,
                    artwork_url: song.artwork || null,
                    duration_seconds: song.duration || null,
                    source_type: song.source || "online",
                    source_url: song.url || null,
                  }));

                  await supabase.from("songs").upsert(songRecords);

                  const likeRecords = chunk.map((song) => ({
                    user_id: userId,
                    song_id: song.id,
                  }));

                  await supabase.from("liked_songs").upsert(likeRecords);
                }
              } catch (syncErr) {
                console.warn("Background seed of owner liked songs failed:", syncErr);
              }
            })();
          } else {
            set({ likedSongs: [], loading: false, hydrated: true });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            } catch (e) {}
          }

          // 5. Setup Realtime subscription to receive instant updates from mobile
          if (!realtimeChannel) {
            realtimeChannel = supabase
              .channel(`web_liked_songs_${userId}`)
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table: "liked_songs",
                  filter: `user_id=eq.${userId}`,
                },
                async () => {
                  const { data: updatedLikes } = await supabase
                    .from("liked_songs")
                    .select("song_id, liked_at, songs(*)")
                    .eq("user_id", userId)
                    .order("liked_at", { ascending: false });

                  if (updatedLikes) {
                    const freshSongs: Song[] = updatedLikes
                      .map((item: any) => {
                        const s = item.songs;
                        if (!s) return null;
                        return {
                          id: s.id,
                          title: s.title,
                          artist: s.artist || "",
                          album: s.album || "",
                          artwork: s.artwork_url || "",
                          url: s.source_url || "",
                          duration: s.duration_seconds || 0,
                          source: s.source_type === "local" ? "local" : "online",
                        } as Song;
                      })
                      .filter(Boolean) as Song[];

                    set({ likedSongs: freshSongs });
                    try {
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshSongs));
                    } catch (e) {}
                  }
                }
              )
              .subscribe();
          }
          return;
        }
      } else if (isAdmin) {
        // Fallback for admin if session not yet established
        const seedSongs = getAdminFormattedSeedSongs();
        set({ likedSongs: seedSongs, loading: false, hydrated: true });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSongs));
        } catch (e) {}
        return;
      }
    } catch (err) {
      console.warn("Failed to sync liked songs from Supabase:", err);
    }

    if (isAdmin && get().likedSongs.length === 0) {
      const seedSongs = getAdminFormattedSeedSongs();
      set({ likedSongs: seedSongs, loading: false, hydrated: true });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSongs));
      } catch (e) {}
      return;
    }

    set({ hydrated: true, loading: false });
  },

  toggleLike: async (song: Song) => {
    const toast = useToastStore.getState();
    const current = get().likedSongs;
    const exists = current.some((s) => songsMatch(s, song));
    const updated = exists
      ? current.filter((s) => !songsMatch(s, song))
      : [song, ...current];

    // Optimistic UI update
    set({ likedSongs: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save liked songs:", e);
    }

    toast.show(exists ? "Removed from Liked Songs" : "Added to Liked Songs", exists ? "info" : "success");

    // Sync with Supabase backend
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user && !session.user.is_anonymous) {
        const userId = session.user.id;

        if (exists) {
          await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", userId)
            .eq("song_id", song.id);
        } else {
          // 1. Ensure song metadata exists in public.songs
          await supabase.from("songs").upsert({
            id: song.id,
            title: song.title,
            normalized_title:
              song.normalized_title ||
              normalizeSongTitle(song.title) ||
              song.title.toLowerCase().trim(),
            artist: song.artist || "",
            album: song.album || null,
            artwork_url: song.artwork || null,
            duration_seconds: song.duration || null,
            source_type: song.source || "online",
            source_url: song.url || null,
          });

          // 2. Insert into public.liked_songs
          await supabase.from("liked_songs").upsert({
            user_id: userId,
            song_id: song.id,
          });
        }
      }
    } catch (e) {
      console.warn("Database like sync failed:", e);
    }
  },

  isLiked: (songOrId: Song | string) => {
    if (!songOrId) return false;
    const { likedSongs } = get();
    if (!likedSongs || likedSongs.length === 0) return false;

    if (typeof songOrId === "string") {
      const directMatch = likedSongs.some((s) => s.id === songOrId);
      if (directMatch) return true;
      return false;
    }

    return likedSongs.some((s) => songsMatch(s, songOrId));
  },

  clearLiked: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    set({ likedSongs: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  },
}));
