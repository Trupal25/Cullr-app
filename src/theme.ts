export const Colors = {
  bgBase: '#080C0C',
  bgSurface: '#0E1414',
  surface: '#101414',
  surfaceContainerLowest: '#0B0F0F',
  surfaceContainerLow: '#181C1C',
  surfaceContainer: '#1C2020',
  surfaceContainerHigh: '#272B2B',
  surfaceContainerHighest: '#313635',
  surfaceBright: '#363A3A',

  primary: '#62ECDB',
  primaryContainer: '#3ECFBF',
  primaryFixedDim: '#4EDBCB',
  onPrimary: '#003732',

  secondary: '#A8CECB',
  onSecondaryContainer: '#97BCBA',
  secondaryContainer: '#294D4B',

  danger: '#E05C5C',
  dangerMuted: 'rgba(224, 92, 92, 0.1)',
  dangerBorder: 'rgba(224, 92, 92, 0.4)',
  warningOrange: '#C4854A',

  errorContainer: '#93000A',
  error: '#FFB4AB',

  textPrimary: '#EFF6F5',
  textSecondary: '#6B8F8D',
  textMuted: '#97BCBA',
  textDark: '#334443',
  onSurface: '#E0E3E2',
  onSurfaceVariant: '#BBCAC6',

  outline: '#859490',
  outlineVariant: '#3C4947',
  border: '#1E2E2D',
  sheetBg: '#141D1D',
  handleBg: '#1E2E2D',

  trashIconBg: '#1A3F3C',
} as const;

export const Typography = {
  headline: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headlineMedium: {
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  headlineSemibold: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  body: {
    fontFamily: 'Inter_400Regular',
  },
  bodyMedium: {
    fontFamily: 'Inter_500Medium',
  },
  bodyLight: {
    fontFamily: 'Inter_300Light',
  },
  mono: {
    fontFamily: 'SpaceGrotesk_400Regular',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radii = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export const Shadows = {
  surgicalGlow: {
    shadowColor: '#3ECFBF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 4,
  },
  sheetShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;
