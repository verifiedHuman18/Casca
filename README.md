# Casca

[![CI](https://github.com/verifiedHuman18/Casca/actions/workflows/ci.yml/badge.svg)](https://github.com/verifiedHuman18/Casca/actions/workflows/ci.yml)

> **Casca — Campus Management Platform** · OOPS & Software Engineering Project · Team of 3

A unified campus management platform that centralizes campus-wide events, club activities, and section-specific notices into one calendar filtered to what matters to each student, with fine-grained role-based publishing for club office bearers, class representatives (CRs), and admins.

---

## 🏗️ Repository Architecture

This repository is organized as a **TypeScript Monorepo** using npm workspaces:

```
SEnOOM/
├── backend/          # Node.js + Express API, Services, Repositories, Domain Classes
├── client/           # React Native (Expo) mobile frontend
├── shared/           # Shared domain interfaces, enums, and types
├── docs/             # Design document, diagrams, and architecture guides
├── .github/          # CI workflows, PR templates, and issue templates
└── .husky/           # Git hooks (pre-commit, commit-msg)
```

---

## 👥 Team Work Split

| Member       | Focus Area                  | Responsibilities                                                                                                          |
| :----------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Member A** | **Domain & Access Control** | `User`, `Student`, `Section`, `Club`, `Position`, `RoleAssignment`, `AuthService`, `PermissionService`, `RegistryService` |
| **Member B** | **Events & Calendar**       | `Event` hierarchy, `EventFactory`, `EventService`, `CalendarService`, `CalendarFilter`, approval workflow                 |
| **Member C** | **Interface & Quality**     | React Native (Expo) screens, forms, client integration, tests, demo data, documentation                                   |

---

## 🛡️ Code Quality & Contribution Standards

To ensure software engineering rigor, this project enforces strict quality gates:

- **Husky & lint-staged**: Runs formatting and static analysis on staged files on every `git commit`.
- **Prettier**: Consistent styling across all code, markdown, and configuration files.
- **ESLint**: Catches syntax issues, dead code, and enforces TypeScript best practices.
- **Commitlint**: Requires [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **GitHub Actions CI**: Validates formatting, linting, type safety, and commit messages on all PRs.

For detailed guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20+` or `v22+` (v22 recommended)
- **npm**: `v9+`
- **Git**

### Installation & Setup

1. **Clone the repository**:

   ```bash
   git clone <repo-url>
   cd SEnOOM
   ```

2. **Install all dependencies**:

   ```bash
   npm install
   ```

   _(This also initializes the Husky git hooks automatically)_

3. **Build shared domain types**:

   ```bash
   npm run build --workspace=@senoom/shared
   ```

4. **Run quality checks**:
   ```bash
   # Check formatting
   npm run format:check

   # Auto-format files
   npm run format

   # Run ESLint
   npm run lint

   # Run TypeScript compilation checks
   npm run typecheck
   ```

---

## 📖 Documentation

- [Design Document (Single Source of Truth)](docs/design/DESIGN_DOCUMENT.md)
- [System Architecture & OOPS Guidelines](docs/ARCHITECTURE.md)
- [Contribution Guidelines](CONTRIBUTING.md)
