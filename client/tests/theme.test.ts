import { describe, it, expect } from 'vitest';
import { getTheme, ThemeMode } from '../src/theme';

describe('Theme System (client/src/theme.ts)', () => {
  const REQUIRED_COLOR_KEYS = [
    'bg',
    'bgCard',
    'surfaceSubtle',
    'border',
    'borderStrong',
    'textPrimary',
    'textSecondary',
    'textMuted',
    'textLight',
    'pillActiveBg',
    'pillActiveText',
    'pillInactiveBg',
    'pillInactiveText',
    'tintWarm',
    'tintWarmText',
    'tintSage',
    'tintSageText',
    'tintLavender',
    'tintLavenderText',
    'tintSky',
    'tintSkyText',
    'tintRose',
    'tintRoseText',
  ];

  it('provides complete token sets for both light and dark modes', () => {
    const modes: ThemeMode[] = ['light', 'dark'];

    modes.forEach(mode => {
      const theme = getTheme(mode);
      expect(theme.colors).toBeDefined();

      REQUIRED_COLOR_KEYS.forEach(key => {
        expect(
          theme.colors[key as keyof typeof theme.colors],
          `Missing token ${key} in ${mode} mode`
        ).toBeDefined();
        expect(typeof theme.colors[key as keyof typeof theme.colors]).toBe('string');
      });
    });
  });

  it('guarantees light theme has warm sand canvas with dark obsidian text', () => {
    const lightTheme = getTheme('light');
    expect(lightTheme.colors.bg.toLowerCase()).toBe('#f4f3ef');
    expect(lightTheme.colors.textPrimary.toLowerCase()).toBe('#141518');
    expect(lightTheme.colors.bgCard.toLowerCase()).toBe('#ffffff');
  });

  it('guarantees dark theme has deep slate canvas with bright text', () => {
    const darkTheme = getTheme('dark');
    expect(darkTheme.colors.bg.toLowerCase()).toBe('#1a1917');
    expect(darkTheme.colors.textPrimary.toLowerCase()).toBe('#f0ede6');
    expect(darkTheme.colors.bgCard.toLowerCase()).toBe('#242220');
  });

  it('provides distinct pastel tints between light and dark themes', () => {
    const light = getTheme('light');
    const dark = getTheme('dark');

    expect(light.colors.tintWarm).not.toBe(dark.colors.tintWarm);
    expect(light.colors.tintSage).not.toBe(dark.colors.tintSage);
    expect(light.colors.tintLavender).not.toBe(dark.colors.tintLavender);
    expect(light.colors.tintSky).not.toBe(dark.colors.tintSky);
    expect(light.colors.tintRose).not.toBe(dark.colors.tintRose);
  });
});
