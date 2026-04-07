export const Colors = {
  bgBase: '#F8FAFA',
  bgSurface: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F1F5F5',
  surfaceContainer: '#E2E8E8',
  surfaceContainerHigh: '#D1DBDB',
  surfaceContainerHighest: '#BFCACA',
  surfaceBright: '#FAFCFC',

  primary: '#k', // Deeper Luxe Teal
  primaryContainer: '#0D9488', // Use this for backgrounds of some sections
  primaryFixedDim: '#2DD4BF',
  onPrimary: '#FFFFFF',

  secondary: '#134E4A',
  onSecondaryContainer: '#134E4A',
  secondaryContainer: '#CCFBF1',

  danger: '#DC2626',
  dangerMuted: 'rgba(220, 38, 38, 0.08)',
  dangerBorder: 'rgba(220, 38, 38, 0.3)',
  warningOrange: '#EA580C',

  errorContainer: '#FEE2E2',
  error: '#B91C1C',

  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#334155', // Slate 700
  textMuted: '#64748B', // Slate 500
  textDark: '#020617', // Slate 950
  onSurface: '#1E293B',
  onSurfaceVariant: '#475569',

  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',
  border: '#E2E8F0',
  sheetBg: '#FFFFFF',
  handleBg: '#CBD5E1',

  trashIconBg: '#FEE2E2',
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
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  sheetShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;
