// Configuration for hiding sections in the navigation
// This can be overridden by environment variables

export const HIDDEN_SECTIONS = [
  'scheduler',
  'emails',
  'live-chat',
  'quality-assurance',
  'operations',
  'analytics',
  'integrations',
  'settings'
];

// Get hidden sections from environment variable or use default
export const getHiddenSections = (): string[] => {
  const envHidden = import.meta.env.VITE_HIDE_SECTIONS;
  if (envHidden) {
    return envHidden.split(',').map(s => s.trim());
  }
  return HIDDEN_SECTIONS;
};
