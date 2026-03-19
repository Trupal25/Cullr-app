# Cullr — Project Rules

## App
Cullr is a React Native / Expo gallery spam scanner.
Scans photo metadata, scores images for spam probability, lets users bulk delete flagged images.

## Stack
- Expo SDK (latest)
- TypeScript (strict mode, no `any`)
- expo-media-library — gallery access, metadata, delete
- @shopify/flash-list — image grids
- expo-image — thumbnail rendering
- react-native-reanimated — animations
- react-native-safe-area-context — always use SafeAreaView

## Code Rules
- Functional components + hooks only
- kebab-case filenames, PascalCase components
- No inline styles — StyleSheet.create() always
- Always handle permissions before media access
- All deletes must go through a confirmation step

## Design Tokens
- bg-base: #080C0C
- bg-surface: #0E1414
- accent-teal: #3ECFBF
- text-primary: #EFF6F5
- text-secondary: #6B8F8D
- danger: #E05C5C

## Preferences
- Concise responses
- No boilerplate comments
- TypeScript types always explicit