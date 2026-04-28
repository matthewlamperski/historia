/**
 * Historia design tokens — mirrored from the React Native app's
 * `src/constants/theme.ts`. Keep in sync if the mobile palette ever changes.
 */
export const colors = {
  primary: {
    50: '#f7f3ee',
    100: '#ece4d2',
    200: '#dfd4bb',
    300: '#cbb89a',
    400: '#b79f81',
    500: '#927f61',
    600: '#7a6a52',
    700: '#625543',
    800: '#4a4034',
    900: '#322b25',
  },
  secondary: {
    50: '#f9f7f4',
    100: '#f0ebe3',
    200: '#e5dcc9',
    300: '#d4c5aa',
    400: '#c4ae8f',
    500: '#b79f81',
    600: '#9d8769',
    700: '#7d6c54',
    800: '#5e523f',
    900: '#3f382b',
  },
  success: {
    50: '#f3f6f1',
    100: '#e4ebe0',
    200: '#c9d7c1',
    300: '#a8bf9a',
    400: '#87a773',
    500: '#6b8f57',
    600: '#567545',
    700: '#455d37',
    800: '#34452a',
    900: '#232e1c',
  },
  warning: {
    50: '#fdf8f0',
    100: '#faefd9',
    200: '#f5ddb3',
    300: '#edc583',
    400: '#e5ad53',
    500: '#d99531',
    600: '#b77a26',
    700: '#95611f',
    800: '#724a18',
    900: '#503311',
  },
  error: {
    50: '#fdf3f2',
    100: '#fae3e1',
    200: '#f5c7c3',
    300: '#eca39d',
    400: '#e37f77',
    500: '#d95b51',
    600: '#b74840',
    700: '#953833',
    800: '#722a27',
    900: '#501d1b',
  },
  gray: {
    50: '#f7f3ee',
    100: '#ece4d2',
    200: '#d9cdb8',
    300: '#c0b09a',
    400: '#a1917a',
    500: '#7d6f5d',
    600: '#625547',
    700: '#4a4034',
    800: '#322b25',
    900: '#1a1612',
  },
} as const;

export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    '"Open Sans"',
    '"Helvetica Neue"',
    'sans-serif',
  ],
  serif: ['"Iowan Old Style"', '"Apple Garamond"', 'Baskerville', 'Georgia', 'serif'],
} as const;

export const radius = {
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(50, 43, 37, 0.06)',
  md: '0 2px 4px rgba(50, 43, 37, 0.10)',
  lg: '0 4px 12px rgba(50, 43, 37, 0.14)',
  xl: '0 12px 28px rgba(50, 43, 37, 0.18)',
} as const;

export const FIREBASE_PROJECT_ID = 'historia-application';
export const STORAGE_BUCKET = 'historia-application.firebasestorage.app';
