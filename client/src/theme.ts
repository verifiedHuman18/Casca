// Casca · Warm Sand Editorial Design System
// Light & Dark themes — both authored from first principles, not inverted

export type ThemeMode = 'light' | 'dark';

// ─── Light theme ───────────────────────────────────────────────────────────
// Canvas: warm bone/sand paper (#f4f3ef)
// Typography: obsidian (#141518)
// Tints: subdued pastel architectural blocks

const light = {
  bg: '#f4f3ef', // warm bone/sand canvas
  bgCard: '#ffffff',
  surfaceSubtle: '#ebe9e3',
  border: '#e4e2dc',
  borderStrong: '#d5d2c8',

  textPrimary: '#141518',
  textSecondary: '#62646e',
  textMuted: '#9699a3',
  textLight: '#ffffff',

  pillActiveBg: '#141518',
  pillActiveText: '#ffffff',
  pillInactiveBg: 'transparent',
  pillInactiveText: '#141518',

  // Warm pastel tints (zero saturation neon)
  tintWarm: '#faedd9',
  tintWarmText: '#422f18',
  tintSage: '#e3ece5',
  tintSageText: '#233829',
  tintLavender: '#e8e5f2',
  tintLavenderText: '#2b263d',
  tintRose: '#f5e4e2',
  tintRoseText: '#3d2422',
  tintSky: '#e3ecf5',
  tintSkyText: '#1e2f3d',

  // Overlay
  overlayBg: 'rgba(20, 21, 24, 0.5)',

  // Calendar day dot
  dayEventDot: '#141518',
  calendarToday: '#141518',
  calendarTodayText: '#ffffff',
  calendarSelected: '#e8e5f2',
  calendarSelectedText: '#141518',
  calendarWeekHeader: '#9699a3',
};

// ─── Dark theme ────────────────────────────────────────────────────────────
// Canvas: deep warm charcoal (#1a1917) — warm-tinted, not blue-black
// Cards: elevated warm dark surfaces
// Tints: deeply saturated but desaturated — dusty, never neon
// Typography: warm off-white (#f0ede6)

const dark = {
  bg: '#1a1917', // warm charcoal — same warmth as light sand, inverted
  bgCard: '#242220', // elevated surface, slightly lighter
  surfaceSubtle: '#2e2b28', // quiet container fill
  border: '#3a3733',
  borderStrong: '#4a4743',

  textPrimary: '#f0ede6', // warm off-white — mirrors sand warmth
  textSecondary: '#a09d96',
  textMuted: '#6e6b65',
  textLight: '#f0ede6',

  pillActiveBg: '#f0ede6', // inverted pill — light on dark
  pillActiveText: '#1a1917',
  pillInactiveBg: 'transparent',
  pillInactiveText: '#f0ede6',

  // Dark tints — same hue families, deeply shifted, no neon
  tintWarm: '#2d2318', // deep ochre ground
  tintWarmText: '#d4a97a',
  tintSage: '#1c261e', // deep moss ground
  tintSageText: '#7aaa85',
  tintLavender: '#211e30', // deep slate-purple ground
  tintLavenderText: '#a99ccc',
  tintRose: '#2a1b1a', // deep wine ground
  tintRoseText: '#c4918b',
  tintSky: '#1a2230', // deep navy ground
  tintSkyText: '#85a8c4',

  // Overlay — slightly warmer than neutral black
  overlayBg: 'rgba(10, 9, 8, 0.65)',

  // Calendar day dot
  dayEventDot: '#f0ede6',
  calendarToday: '#f0ede6',
  calendarTodayText: '#1a1917',
  calendarSelected: '#2e2b28',
  calendarSelectedText: '#f0ede6',
  calendarWeekHeader: '#6e6b65',
};

export type ColorTokens = typeof light;

export const themes: Record<ThemeMode, ColorTokens> = { light, dark };

export const theme = {
  colors: light, // default; components consume via getTheme(mode)
  radius: {
    sm: 8,
    md: 14,
    lg: 22,
    xl: 28,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },
};

export const getTheme = (mode: ThemeMode) => ({
  ...theme,
  colors: themes[mode],
});
