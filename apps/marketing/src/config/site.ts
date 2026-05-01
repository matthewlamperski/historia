// Centralized site config. All values that need to be filled in by the
// owner are listed in `/TODO.md` at the repo root. The `# TODO` strings
// surface visibly in the UI so nothing ships with placeholder URLs by
// accident.

export const SITE = {
  name: 'Historia',
  tagline: 'Turn every adventure into real rewards.',
  domain: 'historia.app',
  appStoreUrl: import.meta.env.VITE_APP_STORE_URL || '# TODO: App Store URL',
  playStoreUrl: import.meta.env.VITE_PLAY_STORE_URL || '# TODO: Play Store URL',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || '# TODO: support email',
  emails: {
    contact: 'hello@explorehistoria.com',
    support: 'support@explorehistoria.com',
    press: 'press@explorehistoria.com',
  },
  shopUrl: 'https://shophistoria.com',
  pricing: {
    pro: '$1.99/mo',
    trialDays: 14,
  },
} as const;

export function isPlaceholder(value: string): boolean {
  return value.startsWith('# TODO');
}
