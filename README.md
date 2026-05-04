# Aruvi Play

A personal-use music streaming + local playback app built with Expo / React Native.
Spotify-style UI, smart infinite queue, background playback with lock-screen controls,
and hybrid online (JioSaavn) + local MP3 support.

## Tech stack

- Expo SDK 52 (managed → prebuild for Android)
- TypeScript
- Expo Router (file-based routing)
- Zustand (state)
- NativeWind / TailwindCSS (UI)
- React Native Track Player 4 (background audio + lock-screen controls)
- Axios (JioSaavn API)
- expo-document-picker (local file import)
- AsyncStorage (liked songs / recents / resume)

## Folder structure

```
app/                Expo Router screens
  (tabs)/           Home / Search / Library
  player.tsx        Full-screen player (modal)
  _layout.tsx       Root layout — hydrates store + sets up TrackPlayer
components/         Reusable UI (MiniPlayer, SongRow, SeekBar, …)
store/              Zustand stores (player, library)
services/           saavn API, trackPlayer setup, local files, storage
hooks/              usePlaybackEvents, useProgress
utils/              format helpers
types/              shared TS types
scripts/            Kotlin patch for react-native-track-player
```

## Run locally

```bash
pnpm install
pnpm start                 # Metro bundler
# then press "a" for Android, "i" for iOS, or scan QR in Expo Go (audio only*)
```

\* react-native-track-player does **not** work in Expo Go — it requires native
build. Use a development build or build an APK (below).

### First-run dev build

```bash
pnpm exec expo prebuild --platform android
pnpm android        # builds + installs a dev client
```

## Build a release APK

```bash
pnpm build:apk:github
```

This script:
1. Runs `scripts/patch-track-player-kotlin.js` to bump RN Track Player's
   pinned Kotlin to 1.9.24 (otherwise Gradle blows up on RN 0.76).
2. Sets `JAVA_HOME` (JDK 17) and `ANDROID_HOME`.
3. Runs `expo prebuild --platform android --no-install` to generate the
   `android/` project.
4. `cd android && ./gradlew assembleRelease`.

The APK lands at `android/app/build/outputs/apk/release/app-release.apk`.

If your JDK is at a different path, edit the `build:apk:github` script in
`package.json`. The defaults assume:

```
$HOME/jdk/jdk-17.0.11+9/Contents/home
$HOME/Library/Android/sdk
```

## API integration (JioSaavn)

`services/saavn.ts` wraps the public `https://saavn.dev/api` mirror:

| Function                 | Endpoint                          |
| ------------------------ | --------------------------------- |
| `searchSongs(q)`         | `GET /search/songs?query=...`     |
| `getSongById(id)`        | `GET /songs?ids=...`              |
| `getRelatedSongs(id)`    | `GET /songs/{id}/suggestions`     |
| `getTrending()`          | `GET /search/songs?query=...`     |

Each response is normalized into the local `Song` type:

```ts
{ id, title, artist, album, artwork, url, duration, source: "online" | "local" }
```

## Smart infinite queue

When a song starts playing, `playerStore.appendRelatedIfNeeded()` is called.
While the active queue has 5 or fewer remaining tracks, it fetches related
songs from `/songs/{id}/suggestions` and appends them. The same hook fires
on `PlaybackQueueEnded` so the queue never actually ends for online tracks.

Local songs (`source: "local"`) are not extended — they play to completion.

## Background playback

`services/playbackService.ts` is registered via `index.js`:

```js
TrackPlayer.registerPlaybackService(() => PlaybackService);
```

It wires Remote Play / Pause / Next / Prev / Seek / Duck events so that the
lock-screen and notification controls work after the app is backgrounded or
the screen is locked. Android permissions (`FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `POST_NOTIFICATIONS`) are
declared in `app.json`. iOS requires `UIBackgroundModes: ["audio"]`, also in
`app.json`.

## Hybrid playback

- **Online** — picked via Search / Home; played from `downloadUrl[].url` (320kbps preferred).
- **Local** — Library → Local files → Import. Uses `expo-document-picker` to
  copy MP3/M4A files into the app cache, then plays them as a normal track.

The store doesn't care which is which — both go through the same TrackPlayer
queue. Only the related-songs auto-append is gated on `source === "online"`.

## State (Zustand)

- `usePlayerStore` — current track, queue, index, isPlaying, shuffle, repeat,
  plus actions (`playSong`, `togglePlay`, `next`, `prev`, `seekTo`,
  `toggleShuffle`, `cycleRepeat`).
- `useLibraryStore` — liked songs and recently played, persisted to
  AsyncStorage.

## Bonus features included

- **Liked songs** persisted in AsyncStorage (`storage.ts → loadLiked / saveLiked`)
- **Recently played** auto-tracked (last 30) and shown on Home
- **Resume support** — `saveLastPlayed` records the last song + position;
  on app reopen the Library/Recents lets you resume

## Assets

Place icons at:

- `assets/icon.png` (1024×1024)
- `assets/adaptive-icon.png` (1024×1024 foreground)
- `assets/splash.png` (1284×2778)

Without them, `expo prebuild` will generate fallback assets — fine for
testing.

## Notes

- This app is for personal use. The JioSaavn API mirror is a public
  unofficial endpoint — don't redistribute the app or use it commercially.
- `newArchEnabled: false` is set because react-native-track-player's
  Fabric/TurboModule support has been flaky on RN 0.76 — flip it on once
  upstream stabilizes.
