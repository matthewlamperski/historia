export const theme = {
  colors: {
    // Brand primary - Warm browns (based on #927f61)
    primary: {
      50: '#f7f3ee',   // Lightest cream - backgrounds
      100: '#ece4d2',  // Light tan - cards, surfaces
      200: '#dfd4bb',  // Lighter brown
      300: '#cbb89a',  // Light-medium brown
      400: '#b79f81',  // Medium-light brown
      500: '#927f61',  // Main brand color - buttons, links
      600: '#7a6a52',  // Darker brown - hover states
      700: '#625543',  // Deep brown
      800: '#4a4034',  // Very deep brown
      900: '#322b25',  // Almost black brown
    },
    // Secondary - Slightly lighter variation
    secondary: {
      50: '#f9f7f4',
      100: '#f0ebe3',
      200: '#e5dcc9',
      300: '#d4c5aa',
      400: '#c4ae8f',
      500: '#b79f81',  // Secondary brand color
      600: '#9d8769',
      700: '#7d6c54',
      800: '#5e523f',
      900: '#3f382b',
    },
    // Success - Earthy green
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
    // Warning - Warm amber
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
    // Error - Muted red
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
    // Neutral grays - Warm gray scale from cream to black
    gray: {
      50: '#f7f3ee',   // Cream
      100: '#ece4d2',  // Light tan
      200: '#d9cdb8',  // Tan
      300: '#c0b09a',  // Medium tan
      400: '#a1917a',  // Brown-gray
      500: '#7d6f5d',  // Medium brown-gray
      600: '#625547',  // Dark brown-gray
      700: '#4a4034',  // Deep brown-gray
      800: '#322b25',  // Very dark
      900: '#1a1612',  // Almost black
    },
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  borderRadius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 10,
    },
  },
} as const;

export type Theme = typeof theme;
