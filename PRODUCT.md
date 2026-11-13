# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

- **Primary**: University / college undergraduate and postgraduate students seeking an authoritative, clutter-free schedule of their daily classes, labs, club activities, and campus-wide events.
- **Role Actors**:
  - **Class Representatives (CRs)**: Elected student leaders responsible for authoring and broadcasting section-level academic announcements, lab tests, and class schedule updates.
  - **Club Coordinators & Society Office Bearers**: Student leaders publishing hackathons, workshops, and algorithmic contests on behalf of recognized clubs (e.g., Coding Club, Robotics Club).
  - **Campus Administrators**: Institutional authorities reviewing campus-wide event broadcast requests (UC-14/UC-15) and managing institutional calendars.

## Product Purpose

Casca is a multi-tenant campus event and calendar platform designed to eliminate university communication fragmentation (unregulated chat groups, paper notice boards, social media noise). It delivers a unified, authoritative chronological feed partitioned into three distinct polymorphic scopes: Section, Club, and Campus.

## Positioning

Unlike generic calendar tools or informal social messaging groups:

- Enforces strict institutional Role-Based Access Control (RBAC) anchored in clean 4-layer object-oriented domain models.
- Guarantees scope isolation: Section events are strictly contained within enrolled sections by default, with cross-section read-only browsing (UC-04).
- Formalizes governance: Campus-wide event broadcasts cannot bypass administrative approval (UC-14/UC-15).

## Operating Context

- **Environment**: Native Android mobile devices carried across campus lecture halls, laboratories, and outdoor venues.
- **Temporal Handling**: All database timestamps persist in UTC; client presentation strictly formats to Indian Standard Time (IST) with technical tabular typography.
- **Connectivity**: Mobile client designed with offline fallback resilience against campus Wi-Fi drops and cellular congestion.

## Capabilities and Constraints

- **Core Capabilities**:
  - Dual-mode calendar navigation: 7-column Month Matrix Grid with density dot indicators and rapid Week Strip Carousel.
  - Hourly timeline stream with continuous time rails, duration chips, and dynamic "NOW" laser current-time markers.
  - Multi-scope filtering (`ALL`, `CAMPUS`, `CLUB`, `SECTION`).
  - UC-04 cross-section inspection lens (e.g. Section IT-A students inspecting IT-B schedules in read-only mode).
  - Direct event authoring with client-side permission pre-validation and admin approval workflows.
  - In-app persona switcher for rapid acceptance and role verification.
- **Technical Constraints**:
  - React Native / Expo SDK 58 client running on native Android devices (`minSdk: 24`, `targetSdk: 36`).
  - Strict 4-layer architecture: Domain Entities, Repositories, Services, Controllers.
  - Monorepo structure with `@senoom/shared` contract library enforcing TypeScript strict mode.
  - Zero direct client database access; all interactions strictly over REST endpoints.

## Brand Commitments

- **Application Name**: Casca (`com.casca.app`).
- **Visual Aesthetic**: Chrono Obsidian & Signal Accents.
  - Dominant canvas: Deep Obsidian (`#08090d`) and elevated slate surfaces (`#141822`, `#1a202e`).
  - Signal accents: Campus Vermilion (`#ff5c00`), Club Cyan (`#00d4ff`), Section Emerald (`#00f59b`), Laser Crimson (`#ff2e63`).
- **Iconography**: Absolute ban on generic emojis; strict usage of 2px geometric technical vector glyphs (`@expo/vector-icons/Feather`).

## Evidence on Hand

- Native standalone release APK (20 MB) compiled and deployed to physical Samsung Galaxy S24 FE (`SM_S721B`).
- 50 passed test suites covering domain entities, permission gateways, repository mappers, and PostgreSQL migrations.
- Working mock dataset in [client/src/services/api.ts](file:///home/humaniac/Projects/SEnOOM/client/src/services/api.ts) verified against UI prototypes.

## Product Principles

1. **Institutional Truth First**: An event displayed on Casca must be verifiable, authorized by the appropriate role bearer, and accurate.
2. **Glanceable Temporal Clarity**: A student between classes needs to know where to be within 2 seconds; timeline rails and time gutters take priority over decorative clutter.
3. **Strict Boundary Scoping**: No noise pollution across academic sections or unrelated societies; permissions and visibility are strictly enforced.
4. **Resilient Native Experience**: The application must run cleanly standalone on Android with native touch performance, fluid scrolling, and crisp contrast under any lighting condition.

## Accessibility & Inclusion

- High contrast text on dark surfaces compliant with WCAG AAA for critical schedule text (`#f8fafc` on `#08090d` / `#141822`).
- Touch targets sized to minimum 44x44 dp for mobile thumb reachability.
- Multi-dimensional status indicators combining color, text labels, and geometric vector icons so colorblind students never rely on color alone.
