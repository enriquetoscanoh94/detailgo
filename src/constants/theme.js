/**
 * Design tokens for Detail Go.
 *
 * Clean light theme: white surfaces, blue primary, soft neutrals.
 * Single source of truth for colors, spacing, radii, typography and shadows.
 * Components read from here so the visual language stays consistent.
 */

export const colors = {
  // Brand — premium DARK theme (navy + cyan + gold), adapted from the Figma
  // "Detail Go" landing. Cyan is the primary accent; text on it is dark.
  primary: '#06B6D4', // cyan-500
  primaryDark: '#0891B2', // cyan-600
  primaryLight: '#0C2A38', // dark cyan-tinted surface (chips, upload boxes)
  aqua: '#22D3EE', // cyan-400
  aquaLight: '#0E2A35',
  gold: '#F5B841', // amber accent (ratings / highlights)
  silver: '#8FA3BF',
  silverDark: '#6B80A0',

  // Semantic (brightened for a dark background)
  success: '#22C55E',
  successLight: '#0F2A1C',
  warning: '#F5B841',
  warningLight: '#2A2411',
  danger: '#F87171',
  dangerLight: '#2A1618',
  info: '#22D3EE',

  // Neutrals
  text: '#E8EDF4', // near-white
  textMuted: '#6B80A0', // slate blue-gray
  textOnPrimary: '#04121B', // dark text on the bright cyan primary
  border: '#1C2C44',
  divider: '#152337',
  background: '#06101F', // deep navy
  surface: '#0D1B2E', // card
  surfaceMuted: '#0A1626', // subtle inset
  overlay: 'rgba(2, 8, 18, 0.72)',

  // Misc
  transparent: 'transparent',
  star: '#F5B841',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const shadow = {
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const theme = { colors, spacing, radius, fontSize, fontWeight, shadow };

export default theme;
