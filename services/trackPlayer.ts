import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioMetadata,
  type AudioPlayer,
} from "expo-audio";
import { Song } from "../types/song";

let player: AudioPlayer | null = null;
let setupPromise: Promise<boolean> | null = null;

export async function setupPlayer(): Promise<boolean> {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "duckOthers",
      });
      player = createAudioPlayer(null, { updateInterval: 500 });
      return true;
    } catch (error) {
      console.error("Failed to setup player:", error);
      setupPromise = null; // Allow retry on failure
      return false;
    }
  })();

  return setupPromise;
}

export function tryGetPlayer(): AudioPlayer | null {
  return player;
}

function songToMetadata(song: Song): AudioMetadata {
  return {
    title: song.title,
    artist: song.artist,
    albumTitle: song.album,
    artworkUrl: song.artwork,
  };
}

export function loadAndPlay(song: Song) {
  if (!player) return;
  player.pause();
  player.replace({ uri: song.url });
  try {
    player.setActiveForLockScreen(true, songToMetadata(song), {
      showSkipNext: true,
      showSkipPrevious: true,
    });
  } catch {
    // setActiveForLockScreen is no-op on platforms without lock-screen support (e.g. web).
  }
  player.play();
}

export function updateLockScreen(song: Song) {
  if (!player) return;
  try {
    player.updateLockScreenMetadata(songToMetadata(song));
  } catch {}
}

export function clearLockScreen() {
  if (!player) return;
  try {
    player.clearLockScreenControls();
  } catch {}
}
