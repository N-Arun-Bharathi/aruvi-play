# Aruvi Play Deployment Guide

## Web Application (`apps/web`)
```bash
pnpm --filter web build
```
Generates static production assets in `apps/web/dist`.

## Mobile Application (`apps/mobile`)
```bash
cd apps/mobile
npx expo build:android
```
