import { createContext } from 'react';

// Shared context so any screen can trigger a profile re-check in App.tsx
// Extracted to its own file to avoid circular imports (App → Navigator → Screen → App)
export const ProfileRefreshContext = createContext<() => Promise<void>>(() => Promise.resolve());
