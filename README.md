# GullyCric

GullyCric is an Expo React Native app for creating, scoring, and sharing informal cricket matches. It supports web export/PWA deployment and uses Supabase for auth, profiles, match data, and live updates.

## Features

- Authenticated player profiles with username-based discovery.
- Create fixtures or live matches with teams, toss details, overs, and rules.
- Ball-by-ball scoring with live match state and public share pages.
- Match history, fixtures, leaderboard, settings, and PWA install support.

## Requirements

- Node.js and npm
- Expo CLI through `npx expo`
- Supabase project with the schema from the migration SQL files in this repo

## Environment

Create a `.env` file with:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Only use the public anon key in this app. Keep service-role keys out of client code and deployment logs.

## Scripts

```bash
npm install
npm run web
npm run typecheck
npm run build:web
npm run production:check
```

`npm run production:check` runs TypeScript validation and exports the production web build into `dist/`.

## Deployment

Netlify is configured through `netlify.toml`:

- Build command: `npx expo export -p web`
- Publish directory: `dist`
- SPA fallback: all routes redirect to `/index.html`

Configure the two `EXPO_PUBLIC_SUPABASE_*` variables in the hosting provider before deploying.

## Tech Stack

- Expo / React Native / React Native Web
- React Navigation
- Supabase
- TypeScript
