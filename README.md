# Casca — Campus Management & Academic Scheduling Platform

[![CI](https://github.com/verifiedHuman18/Casca/actions/workflows/ci.yml/badge.svg)](https://github.com/verifiedHuman18/Casca/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B%20%7C%2022%2B-green.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61dafb.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-black.svg)](https://expo.dev/)
[![Vitest](https://img.shields.io/badge/Tests-138%20Passing-brightgreen.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Casca** is an academic management and calendar platform developed as an OOPS & Software Engineering project by a team of 3. It centralizes fragmented campus notices, club sessions, and section-specific lectures into a single, high-craft chronological calendar filtered to each student's exact academic profile, enforced by strict Role-Based Access Control (RBAC) and clean 4-layer object-oriented architecture.

---

## 📑 Table of Contents

- [Problem & Purpose](#-problem--purpose)
- [Key Features](#-key-features)
- [System Architecture & OOPS Design](#-system-architecture--oops-design)
- [Team Work Split](#-team-work-split)
- [Repository Structure](#-repository-structure)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#1-clone--install-dependencies)
  - [Build Shared Types](#2-build-shared-domain-contracts)
  - [Running the Backend API](#3-running-the-backend-api)
  - [Running the Mobile/Web Client](#4-running-the-react-native-expo-client)
- [Testing & Quality Gates](#-testing--quality-gates)
- [Available Scripts Reference](#-available-scripts-reference)
- [API Overview](#-api-overview)
- [Documentation Links](#-documentation-links)

---

## 🎯 Problem & Purpose

Campus communications at universities are often fractured across unofficial messaging channels, cluttered social media handles, and paper notice boards. This results in:

- **Noise Pollution**: Students miss critical section lectures or lab exams amidst spam.
- **Unauthorized Broadcasts**: Anyone can claim an event is happening without institutional governance.
- **Scheduling Conflicts**: Multiple clubs schedule large hackathons in the same halls at the same time.

**Casca solves this by providing:**

1. **One Authoritative Student Registry**: Every student is mapped to an exact `(course, label, year)` section and holds dynamic role assignments.
2. **Three Polymorphic Scopes**: Events are strictly scoped to `CAMPUS`, `CLUB`, or `SECTION`.
3. **Formal Approval Governance**: Club office bearers cannot broadcast campus-wide events directly; they submit proposals reviewed and approved by SAC Admins (UC-14, UC-15).
4. **Cross-Section Inspection (UC-04)**: Students can inspect other sections' timetables in read-only mode without cluttering their default view.

---

## ✨ Key Features

### 📅 Dual-Mode Academic Calendar

- **Day View**:
  - Asymmetrical typographic date hero (`12 NOV`) with Indian Standard Time (IST) formatting.
  - Interactive **7-Day Week Strip Carousel**: Tap any day of the week to immediately view its schedule, complete with density dots for days containing events.
  - **Day Navigation Chevrons**: Seamless `<` and `>` buttons step day-by-day across month and year boundaries.
  - **Quick Jump to Today**: Instant return button `[ ⟲ Today ]` appears whenever viewing a non-current date.
  - Time-gutter cards highlighting start time, end time, venue, and duration pills (`1h 30m`).
- **Month View**:
  - 7-column calendar matrix (`< NOVEMBER 2026 >`) with active day markers and event density dots.
  - Selected day schedule listing directly underneath the calendar grid.
- **Event Detail Sheet**:
  - Full-screen view with start/end time rails, duration badges, venue logistics, scope labels, description notes, and share actions.

### 🔐 Role-Based Access Control (RBAC) & Governance

- **Student**: Read-only access to enrolled section timetable, public club sessions, and official campus notices.
- **Class Representative (CR)**: Authorized to author, reschedule, and update section lectures and lab schedules.
- **Club Coordinator / Officer**: Authorized to publish club-scoped events and submit `PENDING_APPROVAL` campus broadcast proposals.
- **SAC Admin**: Reviews pending campus event requests with one-tap approve or rejection with feedback reasons (UC-15); publishes direct campus notices.

### 🎨 Warm Sand Editorial Design System

- **Serene Palette**: Warm bone/sand canvas (`#f4f3ef`), crisp card surfaces (`#ffffff`), and Obsidian typography (`#141518`).
- **Restrained Architectural Tints**: Muted wheat (`#faedd9`), soft sage (`#e3ece5`), quiet lavender (`#e8e5f2`), and pale sky (`#e3ecf5`).
- **Dual Theme Support**: Comprehensive Light and Dark mode (`#1a1917` warm charcoal canvas) authored from first principles with WCAG AAA contrast compliance.
- **Standardized Navigation**: All top bar pills (Segmented Calendar Control, Queue, Proposals, and Settings) share an exact, uniform 44px height.

### ⚡ Smooth Native Interactions & Drawers

- **Swipeable Drawers**: Gesture-driven bottom sheets (`SwipeableDrawer`) with drag handles and static overlay backdrops.
- **Animated Floating Focus Inputs**: Physics-based elevation (`translateY: -6`, `scale: 1.025`, drop shadow) and floating accessory headers (`[✓ Done]`) preventing keyboard obstruction.
- **Approval Queue Drawer (UC-15)**: Live review interface for Admins to inspect requests and enter rejection feedback.
- **My Requests & Resubmission Drawer (UC-14)**: Live dashboard for Club Officers to track proposal statuses and resubmit rejected events.
- **Authentication & Self Sign-Up Screen (UC-01, UC-13)**: Sign-in and enrollment registration screen with student section assignment.

---

## 🏛️ System Architecture & OOPS Design

Casca is built according to a strict **4-layer Clean Architecture** with pure Object-Oriented Domain Invariants:

```
┌────────────────────────────────────────────────────────┐
│             Client Layer (Expo / React Native)         │
│   Day / Month Views · Swipeable Drawers · API Service  │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON
┌───────────────────────────▼────────────────────────────┐
│          Transport / Controller Layer (Express)        │
│    AuthController · EventController · CalendarCtrl     │
│       requireAuth & requirePermission Middleware       │
└───────────────────────────┬────────────────────────────┘
                            │ Service Invocation
┌───────────────────────────▼────────────────────────────┐
│              Application / Service Layer               │
│   AuthService · PermissionService · EventService       │
│             CalendarService · EventFactory             │
└───────────────────────────┬────────────────────────────┘
                            │ Domain Operations
┌───────────────────────────▼────────────────────────────┐
│               Domain Layer (Pure OOP)                  │
│   User (Student, Admin) · Event (Campus, Club, Section)│
│    RoleAssignment (Association) · Position · Section   │
└───────────────────────────┬────────────────────────────┘
                            │ Repository Interfaces
┌───────────────────────────▼────────────────────────────┐
│            Persistence Layer (PostgreSQL)              │
│       Postgres Repositories · Aiven Cloud Database     │
└────────────────────────────────────────────────────────┘
```

### Applied Object-Oriented Principles

- **Inheritance & Polymorphism**:
  - `User` abstract base class extended by `Student` and `Admin`.
  - `Event` abstract base class extended by `CampusEvent`, `ClubEvent`, and `SectionEvent`, each encapsulating its own polymorphic `isVisibleTo(student)` and `canBeCreatedBy(user)` rules.
- **Association Class**:
  - `RoleAssignment` decouples students from fixed role flags, allowing one student to simultaneously hold multiple positions across clubs and sections with distinct start/end dates.
- **Factory Pattern**:
  - `EventFactory` encapsulates domain instantiation and validation based on event scope.
- **Repository Pattern**:
  - Decoupled storage interfaces (`EventRepository`, `StudentRepository`, `AdminRepository`, `ClubRepository`, `PositionRepository`, `SectionRepository`) with both PostgreSQL and in-memory mock implementations for automated testing.

---

## 👥 Team Work Split

| Member       | Focus Area                  | Core Responsibilities                                                                                                                                                                                                            |
| :----------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Member A** | **Domain & Access Control** | Authored `User`, `Student`, `Section`, `Club`, `Position`, `RoleAssignment`, `AuthService`, `PermissionService`, `RegistryService`, password hashing, JWT validation, and RBAC permission evaluations.                           |
| **Member B** | **Events & Calendar**       | Authored `Event` hierarchy (`CampusEvent`, `ClubEvent`, `SectionEvent`), `EventFactory`, `EventService`, `CalendarService`, `CalendarFilter`, PostgreSQL event queries, and campus event proposal lifecycle.                     |
| **Member C** | **Interface & Quality**     | Authored React Native (Expo) screens, Warm Sand design system, dual theme engine, date matrix utilities, swipeable drawers, approval queue, requests resubmission, animated focus inputs, Vitest test suites, and documentation. |

---

## 📂 Repository Structure

```
SEnOOM/
├── backend/                  # Node.js + Express REST API (TypeScript)
│   ├── src/
│   │   ├── config/           # Database and auth configuration
│   │   ├── controllers/      # Route controllers (Auth, Event, Calendar)
│   │   ├── db/               # PostgreSQL connection pool & migrations
│   │   ├── domain/           # Pure OOP Domain classes (User, Student, Club, etc.)
│   │   ├── events/           # Event domain models, factory, and service logic
│   │   ├── middleware/       # Auth guards & rate limiters
│   │   ├── repositories/     # Repository interfaces & Postgres implementations
│   │   └── services/         # Application services (Auth, Permission, Calendar)
│   └── tests/                # Vitest unit and integration test suites
│
├── client/                   # React Native mobile application (Expo SDK 58)
│   ├── src/
│   │   ├── components/       # UI Components (Drawers, AnimatedFocusInput, AuthScreen)
│   │   ├── services/         # API client & offline mock data fallbacks
│   │   ├── theme.ts          # Warm Sand Light & Dark design tokens
│   │   ├── types/            # UI view models and session contracts
│   │   └── utils/            # Date arithmetic, week strip & calendar matrix generators
│   └── tests/                # Client Vitest suites (Date, Theme, API mappers)
│
├── shared/                   # Shared TypeScript contracts & interfaces
│   └── src/
│       ├── api.ts            # REST request/response interfaces
│       ├── auth.ts           # Authentication & permission enums
│       └── index.ts          # Consolidated exports
│
├── docs/                     # Architectural design & UML documentation
│   ├── ARCHITECTURE.md       # Component, Class, Sequence & State Machine diagrams
│   └── design/
│       └── DESIGN_DOCUMENT.md# Single source of truth specifications
│
├── .github/workflows/        # Automated GitHub Actions CI pipeline
├── .husky/                   # Pre-commit & commit-msg Git hooks
└── package.json              # Monorepo workspaces root configuration
```

---

## 💻 Technology Stack

- **Monorepo Architecture**: npm Workspaces (`backend`, `client`, `shared`)
- **Backend**: Node.js 20+, Express 5, TypeScript 5.7, PostgreSQL 16 (Aiven), `bcrypt`, `jsonwebtoken`, `zod`
- **Frontend / Client**: React Native 0.88, Expo SDK 58, TypeScript 5.7, `@expo/vector-icons` (Feather)
- **Shared Package**: Clean TypeScript type definitions compiled via `tsc`
- **Testing**: Vitest 5.1 (138 passing tests across workspaces), Supertest
- **Quality Gates**: ESLint 9, Prettier 3, Husky 9, lint-staged 15, Commitlint (Conventional Commits)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (`v22` recommended)
- **npm**: `v9.x` or `v10.x`
- **Git**
- _(Optional)_ **Expo Go** app on iOS / Android or Android Studio / Xcode simulators

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/verifiedHuman18/Casca.git
cd Casca

# Install dependencies across all workspaces and initialize git hooks
npm install
```

---

### 2. Build Shared Domain Contracts

The `@senoom/shared` workspace must be built first because both the backend and client import its domain models and enums:

```bash
npm run build --workspace=@senoom/shared
```

---

### 3. Running the Backend API

1. **Configure Environment Variables**:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` with your PostgreSQL database credentials:

   ```env
   PORT=4000
   DATABASE_URL=postgresql://user:password@localhost:5432/campus_platform
   DATABASE_SSL=false
   ```

2. **Execute Database Migrations & Seeds**:

   ```bash
   # Run schema migrations
   npm run db:migrate --workspace=@senoom/backend

   # Seed initial academic sections, clubs, positions, and sample users
   npm run db:seed --workspace=@senoom/backend
   ```

3. **Start the Backend Server**:
   ```bash
   # Run with hot-reloading (via tsx watch)
   npm run dev --workspace=@senoom/backend
   ```
   The backend API will start on `http://localhost:4000`.

---

### 4. Running the React Native (Expo) Client

The mobile client is fully offline-resilient: **it works seamlessly with either the live backend or its built-in mock fallback service** if no backend is running!

1. **Start the Expo Metro Bundler**:

   ```bash
   npm run start --workspace=@senoom/client
   ```

2. **Launch on Target Platform**:
   - **Web Browser**: Press `w` in the terminal (or run `npm run web --workspace=@senoom/client`).
   - **Physical Mobile Device**: Install **Expo Go** on Android/iOS, ensure your phone is on the same local Wi-Fi, and scan the terminal QR code.
   - **Android Emulator**: Press `a` in the terminal.
   - **iOS Simulator** _(macOS only)_: Press `i` in the terminal.

3. **Configuring Backend API Endpoint (Optional)**:
   By default, the client points to `http://localhost:4000`. To point to a custom host, create `client/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://<your-lan-ip>:4000
   ```

---

## 🧪 Testing & Quality Gates

The project maintains 100% green test suites and strict automated quality checks:

```bash
# Run all 138 unit & integration tests across workspaces
npm test

# Run tests in specific workspaces
npm test --workspace=@senoom/backend   # 96 backend tests
npm test --workspace=@senoom/client    # 42 client tests

# Run TypeScript strict typecheck across all workspaces
npm run typecheck

# Check code formatting with Prettier
npm run format:check

# Fix formatting across the repository
npm run format

# Run ESLint across all workspaces
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Git Hooks & Conventional Commits

All commits are inspected by **Husky**, **lint-staged**, and **commitlint**. Commits must follow the Conventional Commits format:

- `feat(ui): add day view date navigation and standardize top bar pill heights`
- `fix(auth): correct token expiration handling`
- `test(client): add week strip date arithmetic tests`
- `docs(readme): update setup instructions and project architecture`

---

## 📋 Available Scripts Reference

| Script                 | Workspace         | Description                                                |
| :--------------------- | :---------------- | :--------------------------------------------------------- |
| `npm run build`        | Root              | Builds `@senoom/shared` and all workspace packages         |
| `npm test`             | Root              | Executes all Vitest test suites across the monorepo        |
| `npm run typecheck`    | Root              | Runs `tsc --noEmit` across all workspaces                  |
| `npm run lint`         | Root              | Runs ESLint analysis across all workspaces                 |
| `npm run format`       | Root              | Formats all code, markdown, and config files with Prettier |
| `npm run format:check` | Root              | Verifies all files adhere to Prettier styling              |
| `npm run dev`          | `@senoom/backend` | Starts backend with hot-reloading on port 4000             |
| `npm run db:migrate`   | `@senoom/backend` | Executes database schema migrations                        |
| `npm run db:seed`      | `@senoom/backend` | Seeds initial sections, clubs, and sample accounts         |
| `npm run start`        | `@senoom/client`  | Launches Expo Metro Bundler for React Native               |
| `npm run web`          | `@senoom/client`  | Launches the client in a desktop web browser               |

---

## 📡 API Overview

| Method   | Endpoint                     | Description                                                             | Auth Required       |
| :------- | :--------------------------- | :---------------------------------------------------------------------- | :------------------ |
| `POST`   | `/api/auth/signup`           | Student self-registration (UC-13)                                       | No                  |
| `POST`   | `/api/auth/login`            | Student / Admin authentication (UC-01)                                  | No                  |
| `POST`   | `/api/auth/logout`           | Revoke session (UC-01)                                                  | Yes                 |
| `GET`    | `/api/auth/me`               | Fetch active user profile, section & roles (UC-02)                      | Yes                 |
| `GET`    | `/api/calendar`              | Retrieve personalized calendar feed (UC-03, UC-04)                      | Yes                 |
| `POST`   | `/api/events`                | Create new event or submit campus proposal (UC-05, UC-06, UC-07, UC-14) | Yes                 |
| `PUT`    | `/api/events/:id`            | Update event title, description, or venue (UC-08)                       | Yes (Owner / Admin) |
| `POST`   | `/api/events/:id/reschedule` | Shift event schedule +24h (UC-08)                                       | Yes (Owner / Admin) |
| `DELETE` | `/api/events/:id`            | Cancel event with status `CANCELLED` (UC-08)                            | Yes (Owner / Admin) |
| `GET`    | `/api/events/pending`        | Fetch pending campus proposals for approval queue (UC-15)               | Yes (Admin)         |
| `POST`   | `/api/events/:id/approve`    | Approve proposal into active campus calendar (UC-15)                    | Yes (Admin)         |
| `POST`   | `/api/events/:id/reject`     | Reject proposal with decision reason note (UC-15)                       | Yes (Admin)         |

---

## 📚 Documentation Links

- [Detailed Design Document (Single Source of Truth)](docs/design/DESIGN_DOCUMENT.md)
- [System Architecture & UML Diagrams Guide](docs/ARCHITECTURE.md)
- [Product Strategy & Positioning](PRODUCT.md)
- [Warm Sand Design System Specification](DESIGN.md)
- [Developer Contribution Guidelines](CONTRIBUTING.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
