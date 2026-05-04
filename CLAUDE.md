# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack snapshot

Expo SDK 54 / React Native 0.81.5 / React 19 / TypeScript / Expo Router / Zustand / NativeWind v4 / `expo-audio` 1.1. Package manager is **pnpm** with `node-linker=hoisted` (see `.npmrc`). The README claims SDK 52 / RN 0.76 and `react-native-track-player` — that's stale; trust `package.json`. The audio layer was migrated off RNTP because RNTP 4.1 doesn't play well with React Native's new architecture, and Reanimated 4 requires new arch.

## Commands

```bash
pnpm install                  # plain install — no postinstall hooks
pnpm start                    # Metro bundler — works with Expo Go
pnpm android | pnpm ios       # dev client build + run (needs native toolchain)
pnpm lint                     # expo lint
pnpm build:apk:github         # release APK — see "Release APK" below
```

No test runner is configured.

### Expo Go works

Because the audio layer is `expo-audio` (an Expo SDK module, bundled into Expo Go), the app boots and plays audio in Expo Go. `pnpm start` and scan the QR — no dev client required for the basic loop.

### Release APK

`pnpm build:apk:github` hard-codes `JAVA_HOME=$HOME/jdk/jdk-17.0.11+9/Contents/home` and `ANDROID_HOME=$HOME/Library/Android/sdk`. If your toolchains live elsewhere, edit the script in `package.json` (it re-exports them, so command-line `JAVA_HOME=...` won't override).

The script runs `expo prebuild --platform android --no-install` followed by `./gradlew assembleRelease`. APK lands at `android/app/build/outputs/apk/release/app-release.apk`. The `android/` directory is generated and gitignored — don't hand-edit it.

## Architecture

### Boot sequence

`index.js` is just `import "expo-router/entry"` — no headless service registration. `app/_layout.tsx` calls `usePlayerStore.init()` and `useLibraryStore.hydrate()` once on mount. `init()` calls `setupPlayer()` (idempotent, guarded by a module-level `isSetup` flag in `services/trackPlayer.ts`), which sets the audio mode (`shouldPlayInBackground: true`, `playsInSilentMode: true`, `interruptionMode: "duckOthers"`) and creates a single `AudioPlayer` instance.

The store flips `ready: true` once `setupPlayer()` resolves; hooks (`usePlaybackEvents`, `useProgress`) gate their event subscriptions on `ready` so they attach exactly when the player is available.

### State model

Two Zustand stores in `store/`:

- **`playerStore.ts`** — queue, current track, index, isPlaying, shuffle, repeat, plus all playback actions. The store is the **brain**: it owns the queue and decides what plays next. The `AudioPlayer` (in `services/trackPlayer.ts`) is a single mutable source slot — there's no native queue. Always go through store actions, never poke the player directly from components.
- **`likedStore.ts`** — exports `useLibraryStore`. Liked songs + recently played, persisted to AsyncStorage under `aruvi:*` keys (see `services/storage.ts`). Recents capped at 30.

### How playback works

`expo-audio` is single-source: one `AudioPlayer` plays one source at a time. To advance to the next track, call `player.replace({ uri })` then `player.play()`. There is no native queue. The store does all queue logic in JS.

`hooks/usePlaybackEvents.ts` is the bridge. It subscribes once (gated on `ready`) to `playbackStatusUpdate` events and forwards two things to the store:

- `status.playing` flips → mirror into `isPlaying`.
- `status.didJustFinish` → call `onTrackFinished()`, which decides repeat-one / advance / queue-end.

This hook is mounted exactly once, in `app/(tabs)/_layout.tsx`. Don't mount it elsewhere — duplicate listeners cause double-advance.

`hooks/useProgress.ts` returns `{ position, duration }` by subscribing to the same status updates. Used by `MiniPlayer` and `SeekBar`.

### Smart infinite queue

`appendRelatedIfNeeded()` in `playerStore` is the auto-extend hook. Called from `playSong`, `next`, and `onTrackFinished`. Rules:

- Only runs when `current.source === "online"` — **local files never auto-extend**.
- Only runs when `queue.length - index <= 5`.
- Guarded by `fetchingRelated` so concurrent triggers dedupe.
- Calls `getRelatedSongs(currentId)` → `/songs/{id}/suggestions` and appends fresh (id-deduped) entries to the JS `queue` array.

`onTrackFinished` will await an `appendRelatedIfNeeded()` before deciding to advance, so an online queue effectively never ends unless `repeat === "off"` and the related-songs API returns nothing new.

### Services boundary

- **`services/saavn.ts`** — wraps `https://saavn.dev/api` (public unofficial JioSaavn mirror). `mapSaavnToSong` normalizes the API's shifting shape into the local `Song` type and **drops songs with no `downloadUrl`** (returns `null`, filtered out by callers). Picks 320kbps audio and 500x500 art.
- **`services/trackPlayer.ts`** — owns the `AudioPlayer` singleton. Exports `setupPlayer`, `tryGetPlayer`, `loadAndPlay(song)`, `clearLockScreen`. The filename is historical — the implementation is `expo-audio`. `loadAndPlay` also sets lock-screen metadata (`title`, `artist`, `albumTitle`, `artworkUrl`) via `setActiveForLockScreen`.
- **`services/localFiles.ts`** — `pickLocalSongs` uses `expo-document-picker` with `copyToCacheDirectory: true`. Local song IDs are prefixed `local:${uri}` to avoid collisions with Saavn IDs. The `source` discriminator on `Song` gates online-only behavior (smart queue).
- **`services/storage.ts`** — AsyncStorage keys: `aruvi:liked`, `aruvi:recent`, `aruvi:lastPlayed`. `saveLastPlayed` powers resume on app reopen.

### Routing

Expo Router, file-based. `app/(tabs)/` is the tab group (`index` = Home, `search`, `library`). `app/player.tsx` is a root-stack modal. `experiments.typedRoutes` is on.

## Native config quirks

- **`newArchEnabled: true`** in `app.json` is required: `react-native-reanimated@4` and `react-native-worklets@0.5` only work on the new architecture. The README still says it's off — that note is stale (RN 0.76 era).
- **pnpm + Metro requires `node-linker=hoisted`** (see `.npmrc`). Without it, Metro/babel can't resolve transitive babel plugins through pnpm's strict layout (`Cannot find module 'babel-preset-expo'`, `@babel/plugin-transform-react-jsx`, etc.).
- Android permissions for foreground media playback (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `POST_NOTIFICATIONS`) live in `app.json` under `android.permissions`. iOS background audio is `infoPlist.UIBackgroundModes: ["audio"]` in the same file. Both are required for `shouldPlayInBackground: true` to actually keep audio alive after lock.
- The `expo-audio` config plugin is registered in `app.json > expo.plugins` — auto-added by `expo install expo-audio`. Don't drop it.

## Styling

NativeWind v4 with `jsxImportSource: "nativewind"` (see `babel.config.js`). Tailwind `content` globs in `tailwind.config.js` cover **only `app/**` and `components/**`** — classnames used elsewhere won't be picked up by the JIT. Don't put Tailwind classes in `services/`, `store/`, or `hooks/`. Theme palette (`bg`, `surface`, `accent`, …) is in `tailwind.config.js`.

`@/*` path alias is configured in `tsconfig.json` but most of the codebase uses relative imports — match the surrounding file.
