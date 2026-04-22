# Gully Cricket Scoring App

A React Native app for scoring informal cricket matches (gully cricket) with live hosting, location-based discovery, and 2D ball-hit animations.

## Features

- **Home**: Live matches, search, map view for nearby matches.
- **My Space**: Create/host live or offline matches.
- **Fixtures**: Scheduled matches.
- **Settings**: User preferences, match rules.

## Setup

1. Install dependencies: `npm install`
2. Set up Firebase: Add your config to `src/services/firebase.ts`
3. Run: `npm run web` or `npm run android`

## Tech Stack

- React Native (Expo)
- Firebase (Auth, Firestore, Realtime DB)
- React Navigation
- Google Maps (via react-native-maps)