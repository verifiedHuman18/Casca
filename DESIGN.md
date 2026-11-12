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
  - `Hero Date Number`: 52px, 900 weight, -1.5px tracking (`12.11`).
  - `Hero Month`: 28px, 800 weight, 2px tracking (`NOV`).
  - `Day of Week`: 15px, 600 weight (`Thursday`).
  - `Card Title`: 20px, 800 weight, 26px line height.
  - `Times & Metrics`: 15px, 700 weight with secondary label (`Start`, `End`).
- **Absence of Eyebrows / Kickers**: Per Impeccable craft rules, titles lead directly without artificial kicker pills above them.

## Layout

- **Top Navigation Bar**:
  - Left: Segmented control pills: `Today` (solid Obsidian pill `#141518`) | `Calendar` (subtle off-white stone pill).
  - Right: Dedicated circular Settings & Profile button (`44×44dp`, `surface-subtle`, Feather `sliders` icon). Opens the interactive **Profile & Settings** sheet.
- **Bottom Floating Action Button (FAB)**:
  - Anchored at bottom-right (`58×58dp`, `pill-active-bg` `#141518`, 8dp elevation, 24dp white `plus` icon).
  - Opens the calm **New Event** authoring sheet directly over both `Today` and `Calendar` views with generous 110dp scroll clearance.
- **Profile & Settings Sheet**:
  - User identity card (`Aarav Sharma · IIT2023001 · IT-A Year 2`).
  - Active Campus Persona switcher (`Student [Read-Only]`, `Class Representative [IT-A]`, `Club Coordinator`).
  - Live campus sync gateway and offline cache metrics.
- **Today Mode (Day Schedule)**:
  - Asymmetrical date hero header (`12.11 NOV`) with aligned secondary academic metadata.
  - Expansive card blocks with 22px internal padding and 16px margins.
- **Calendar Mode (Multi-Day Stacked Feed)**:
  - Subtle month nav: `OCT < NOV 2026 > DEC`.
  - Stacked multi-day cards showing left-hand prominent date numbers and clean timeline items on the right.

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
