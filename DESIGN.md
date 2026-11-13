---
name: Casca
description: Warm Sand Editorial Campus Calendar & Scheduling Platform
colors:
  bg: '#f4f3ef'
  bg-card: '#ffffff'
  surface-subtle: '#ebe9e3'
  border: '#e4e2dc'
  border-strong: '#d5d2c8'
  text-primary: '#141518'
  text-secondary: '#62646e'
  text-muted: '#9699a3'
  pill-active-bg: '#141518'
  pill-active-text: '#ffffff'
  tint-warm: '#faedd9'
  tint-sage: '#e3ece5'
  tint-lavender: '#e8e5f2'
  tint-rose: '#f5e4e2'
  tint-sky: '#e3ecf5'
rounded:
  sm: '8px'
  md: '14px'
  lg: '22px'
  xl: '28px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '14px'
  lg: '20px'
  xl: '28px'
---

# Design System: Warm Sand Editorial

## Overview

Inspired by high-craft editorial design and modern minimalist calendar architecture (Image 1 reference), Casca shifts away from dark command centers and generic AI slop toward a warm, serene, tactile publication feel:

- **Canvas**: Warm bone/sand backdrop (`#f4f3ef`) with soft, natural daylight clarity.
- **Generous Negative Space**: Deep breathing room around day anchors and schedule items.
- **Strict Anti-Clutter Rules**:
  - **Zero Badges**: Eliminates all visual badge tags (`CAMPUS`, `CLUB`, `ACTIVE`, `PENDING_APPROVAL`).
  - **Zero Repetition**: Date is established once with architectural prominence; never restated inside every card.
  - **Restrained Color Hierarchy**: Soft pastel architectural tints (`#faedd9`, `#e3ece5`, `#e8e5f2`) over black/charcoal typography (`#141518`).

## Colors

### Canvas & Ground Planes

- **Backdrop (`#f4f3ef`)**: Natural warm bone/sand paper ground plane.
- **Surface Elevation (`#ffffff`, `#ebe9e3`)**: Clean off-white and subtle stone surfaces.
- **Dividers (`rgba(0, 0, 0, 0.06)`)**: Ultra-faint structural hairline rules.

### Tonal Card Tints (Warm & Restrained)

- **Wheat / Warm Ochre (`#faedd9`)**: Warm morning tint with deep ochre text (`#422f18`).
- **Soft Sage (`#e3ece5`)**: Earthy moss tint with deep forest text (`#233829`).
- **Muted Lavender (`#e8e5f2`)**: Quiet twilight tint with deep slate-purple text (`#2b263d`).
- **Pale Sky (`#e3ecf5`)**: Subtle afternoon tint with deep navy text (`#1e2f3d`).

## Typography

- **Scale & Contrast**:
  - `Hero Date Number`: 64px, 900 weight, -2px tracking (`12`).
  - `Hero Month`: 42px, 800 weight, 1.5px tracking (`NOV`).
  - `Day of Week`: 15px, 600 weight (`Thursday`).
  - `Card Title`: 20px, 800 weight, 26px line height.
  - `Times & Metrics`: 15px, 700 weight with secondary label (`Start`, `End`).
- **Absence of Eyebrows / Kickers**: Per Impeccable craft rules, titles lead directly without artificial kicker pills above them.

## Layout

- **Top Navigation Bar**:
  - Left: Segmented control pills: `Day` (active pill `#141518` / `#f0ede6` in dark mode) | `Month` (subtle stone pill).
  - Right: Dedicated circular Settings button (`44×44dp`, `surface-subtle`, Feather `sliders` icon). Opens the swipeable **Profile & Settings** drawer.
- **Main Screens**:
  - **Day View**: Asymmetrical date hero header (`12 NOV`), week strip carousel, and day schedule cards. Tapping any event navigates directly to the dedicated **Event Details** screen.
  - **Month View**: Full month interactive calendar grid (`< NOVEMBER 2026 >`) with day cells, today indicator, event dots, and selected date schedule list below the grid. Tapping an event opens the **Event Details** screen.
  - **Event Details Screen**: Standalone view with back button, large editorial event title, start/end times with duration pill, logistics & venue card, audience scope, agenda/notes, and interactive reminder action.
- **Swipeable Drawers (Bottom Sheets)**:
  - **Profile & Settings Drawer**: Swipeable down via top drag handle and header zone (`PanResponder`). Features a prominent **Appearance** selector (`Light` | `Dark Mode`), student profile card, interactive **Campus Persona** switcher (`Student`, `Class Rep`, `Club Coordinator`), and sync status.
  - **New Event Drawer**: Triggered via bottom-right FAB (`58×58dp`). Swipeable down to dismiss. Contains scope selector (`Section` | `Club` | `Campus`), title, venue, and description inputs.
  - **Static Overlay Guarantee**: When drawers open, the backdrop overlay appears immediately without fade or slide animation, while only the drawer container animates smoothly upwards.
- **Dual Theme System**:
  - **Light Theme**: Warm bone/sand canvas (`#f4f3ef`), card white (`#ffffff`), Obsidian typography (`#141518`), pastel architectural tints (`#faedd9`, `#e3ece5`, `#e8e5f2`, `#e3ecf5`).
  - **Dark Theme**: Warm charcoal/espresso canvas (`#1a1917`), elevated surfaces (`#242220`), warm off-white typography (`#f0ede6`), deep earthen tints (`#2d2318`, `#1c261e`, `#211e30`, `#1a2230`). Authored from first principles without artificial blue-black or neon.

## Shapes

- **Card Contours**: `radius.xl (28px)` for expansive, approachable tactile containers.
- **Controls & Pills**: `radius.full (9999px)` for pill segmented controls and duration chips.

## Do's and Don'ts

### Do's

- **Do** allow negative space to define relationships instead of dividing boxes or borders.
- **Do** emphasize time via clear Start/End columns and clean duration pills.
- **Do** use soft, subdued tints that respect student eyes in ambient campus light.

### Don'ts

- **Don't** add colored badges or pill tags to event cards.
- **Don't** repeat date numbers across cards within the same day section.
- **Don't** use emojis or high-saturation neon colors.
