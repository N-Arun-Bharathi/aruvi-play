# Aruvi Play Architecture Documentation

## Overview
Aruvi Play is a full-featured, cross-platform music streaming monorepo application.

## Monorepo Layout
- **`apps/mobile`**: React Native / Expo cross-platform mobile application.
- **`apps/web`**: React / Vite responsive web application.
- **`packages/`**:
  - `@aruvi/api`: API client endpoints for songs, playlists, rooms, auth.
  - `@aruvi/database`: Database schemas, SQL queries, Supabase table definitions.
  - `@aruvi/types`: Core TypeScript interface models (`User`, `Song`, `Playlist`, `Room`).
  - `@aruvi/music`: Search algorithms, queue engine, smart recommendations, metadata parsing.
  - `@aruvi/config`: Shared environment variables and constants.
  - `@aruvi/utils`: Versioning, formatting, validation helpers.
- **`backend`**: Node Express backend service.
- **`scripts`**: Monorepo build and release scripts.
