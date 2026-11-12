---
name: Casca
description: Chrono Obsidian Campus Calendar and Event Broadcasting Platform
colors:
  bg: '#08090d'
  bg-subtle: '#0e1117'
  surface: '#141822'
  surface-elevated: '#1a202e'
  surface-hover: '#202738'
  surface-border: '#232b3d'
  surface-border-subtle: '#191f2c'
  surface-border-glow: '#2e3a54'
  text-primary: '#f8fafc'
  text-secondary: '#94a3b8'
  text-muted: '#64748b'
  text-dim: '#475569'
  campus: '#ff5c00'
  club: '#00d4ff'
  section: '#00f59b'
  now-laser: '#ff2e63'
  accent-primary: '#38bdf8'
  accent-blue: '#2563eb'
  accent-amber: '#f59e0b'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
---

# Design System: Chrono Obsidian

## Overview

Casca employs the **Chrono Obsidian** visual language—a dark, high-contrast, technical aesthetic inspired by modern command centers, precision developer tooling (Linear, Vesper, Tokyo Night), and digital chrono interfaces.

It completely avoids generic "AI slop" (clichéd purple gradients, floating cards with washed-out gray text, and decorative emojis) in favor of deep cosmic canvas tones, razor-sharp hairline surface borders, continuous temporal rails, and vivid signal accents that communicate institutional scope instantly.

## Colors

### Surface Hierarchy

- **Canvas Base (`#08090d`)**: Deepest ground plane; minimizes optical fatigue across OLED displays.
- **Surface Elevation (`#141822`, `#1a202e`)**: High-density slate containers for cards, dialogs, and navigation.
- **Hairline Strokes (`#232b3d`, `#191f2c`)**: 1px structural dividers providing tactile separation without heavy drop shadows.

### Semantic Signal Accents

- **Campus Scope (`#ff5c00`)**: Signal Vermilion. Used exclusively for university-wide, high-authority announcements and symposiums.
- **Club Scope (`#00d4ff`)**: Electric Cyan. Highlights student society workshops, hackathons, and competitive coding contests.
- **Section Scope (`#00f59b`)**: Phosphor Emerald. Identifies localized lectures, lab assessments, and tutorial schedules.
- **Laser Timeline (`#ff2e63`)**: Razor Crimson. Denotes the live present moment on the calendar timeline.
- **Institutional Warning (`#f59e0b`)**: Radiant Amber. Designates read-only cross-section modes (UC-04) and pending administrative approval queues (UC-14).

## Typography

- **Tracking & Geometry**: Micro-tracked uppercase metadata (`letter-spacing: 0.8px – 2.2px`) establishes high-end technical legibility.
- **Tabular Figures**: Numeric time ranges and dates utilize tabular alignment for scannable time gutters.
- **Hierarchy Scale**:
  - `Display / Brand`: 20px, 900 weight, 2.2px tracking (`CASCA`).
  - `Headings`: 16px–18px, 800 weight (`NOVEMBER 2026`).
  - `Card Titles`: 14px, 700 weight, 19px line height.
  - `Body / Descriptions`: 12px, 500 weight, 17px line height (`#94a3b8`).
  - `Micro Badges`: 9px–11px, 800 weight, uppercase tracking.

## Layout

- **Dual-Mode Calendar Matrix**:
  - **Month Grid**: 7-column matrix (`S, M, T, W, T, F, S`) with density dot clusters under dates indicating active event scopes.
  - **Week Strip**: 7-day horizontal carousel for single-handed thumb interaction.
- **Hourly Timeline Gutter**: Left-aligned 60dp time rail connected by continuous vertical 1.5px lines and node anchors.
- **Edge-to-Edge Android Insets**: Dynamic safe-area top padding (`StatusBar.currentHeight + 8dp`) and 62dp bottom glassmorphic navigation bar.

## Elevation & Depth

- **Tonal Elevation over Drop Shadows**: Surfaces distinguish depth through calibrated background steps (`#08090d` ➔ `#141822` ➔ `#1a202e`) rather than fuzzy blur shadows.
- **Glow Accents**: Micro-borders utilize 10%–20% alpha fills matching their respective scope signal color (`rgba(0, 245, 155, 0.12)`).

## Shapes

- **Radius Scale**:
  - `sm (4px)`: Micro-badges, scope chips, and dot markers.
  - `md (8px)`: Date cells, input controls, action buttons.
  - `lg (12px–14px)`: Event cards, calendar matrix container, modals.
  - `full`: Circular avatars, status pips, indicator dots.

## Components

- **Event Card**: 4px left-border signal stripe, header row with scope badge and time duration pill, high-contrast title, venue row with location pin.
- **Scope Filter Pills**: Toggle pills with 6px colored indicator pips, active glow state, and real-time count badges.
- **Section Lens Pill**: Interactive banner showing active section status (`IT-A`) and cross-section inspection trigger (`IT-B (Read-Only)`).
- **Iconography**: Exclusively 2px stroke geometric vector icons via `@expo/vector-icons/Feather`. Zero emojis.

## Do's and Don'ts

### Do's

- **Do** preserve the 4px left border on event cards matching their polymorphic scope color.
- **Do** format all mobile times in Indian Standard Time (IST) with explicit start, end, and duration.
- **Do** maintain high contrast ratios (WCAG AAA) between text (`#f8fafc`) and dark surfaces (`#141822`).
- **Do** use Feather vector icons with consistent 2px stroke width.

### Don'ts

- **Don't** introduce emojis into interface copy, headers, or buttons.
- **Don't** use generic purple-on-white gradients or washed-out gray text.
- **Don't** allow section events to blend with campus events without distinct scope badges.
- **Don't** hardcode fixed top offsets that collide with Android camera punch-holes or notification bars.
