# Contributing to Campus Management Platform

Welcome to the team! This project is developed collaboratively by a **team of 3** for the **OOPS & Software Engineering** project. To ensure high code quality, consistency, and clean version control, all team members must adhere to the standards outlined below.

---

## 1. Team Responsibilities & Work Split

| Member       | Area                        | Core Modules                                                                                                              |
| :----------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Member A** | **Domain & Access Control** | `User`, `Student`, `Section`, `Club`, `Position`, `RoleAssignment`, `AuthService`, `PermissionService`, `RegistryService` |
| **Member B** | **Events & Calendar**       | `Event` hierarchy, `EventFactory`, `EventService`, `CalendarService`, `CalendarFilter`, approval workflow                 |
| **Member C** | **Interface & Quality**     | React Native (Expo) screens, forms, client integration, tests, demo data, documentation                                   |

> [!IMPORTANT]
> **Agree First, Code Later**: The method signatures of `PermissionService.canPublish()`, `Event.isVisibleTo()`, and `CalendarService.getCalendar()` form the core interfaces between Member A, B, and C. Any change to these signatures must be agreed upon by all three members before implementation.

---

## 2. Git Branching Strategy

1. **`main` Branch**:
   - Production-ready, stable codebase.
   - Protected branch: direct pushes are prohibited; all changes must arrive via Pull Requests.
2. **Feature & Bugfix Branches**:
   - Always branch off the latest `main`: `git checkout main && git pull origin main && git checkout -b <branch-name>`.
   - Branch naming format:
     - `feat/<short-description>`: New functional requirements or use cases (e.g. `feat/event-service`).
     - `fix/<short-description>`: Bug fixes (e.g. `fix/section-visibility-filter`).
     - `docs/<short-description>`: Documentation and diagram updates (e.g. `docs/update-class-diagram`).
     - `test/<short-description>`: Acceptance scenario and unit tests (e.g. `test/acceptance-scenarios`).
     - `chore/<short-description>`: Tooling, dependencies, or configuration (e.g. `chore/setup-husky`).

---

## 3. Commit Message Conventions (Conventional Commits)

Commit messages are automatically validated by **Commitlint** via Husky git hooks. Commits that violate the format will be rejected.

### Format

```
<type>(<optional-scope>): <description in imperative present tense>
```

### Types

- `feat`: A new feature or use case implementation.
- `fix`: A bug fix.
- `docs`: Documentation updates.
- `style`: Changes that do not affect the meaning of the code (formatting, missing semi-colons).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding or correcting tests.
- `build`: Changes to build system or external dependencies.
- `ci`: Changes to CI configuration files and scripts.
- `chore`: Other changes that don't modify src or test files.

### Allowed Scopes

`auth`, `roles`, `calendar`, `events`, `ui`, `db`, `config`, `docs`, `shared`, `api`, `deps`.

### Examples

- `feat(events): implement EventFactory and ClubEvent subclass`
- `fix(roles): correctly compute active positions considering endsOn date`
- `docs(design): update section 6.5 campus event approval flow`

---

## 4. Quality Gates & Hooks

Before any code is committed or merged, quality gates are enforced automatically:

- **Husky**: Triggers hooks on git events.
- **Pre-commit hook**: Runs `lint-staged` on staged files.
  - Automatically runs `eslint --fix` and `prettier --write` on code files.
  - Formats markdown and JSON files.
- **Commit-msg hook**: Validates commit message structure against Conventional Commits.
- **Continuous Integration (CI)**: Runs format checks, linter analysis, and type-checking across all PRs.

---

## 5. Development Workflow

```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Build shared domain definitions
npm run build --workspace=@casca/shared

# 3. Check formatting across entire codebase
npm run format:check

# 4. Auto-format entire codebase
npm run format

# 5. Run static analysis & linting
npm run lint

# 6. Typecheck all workspaces
npm run typecheck
```

---

## 6. OOPS & Architecture Principles to Follow

1. **Clean Layering**: UI (`client/`) never speaks to the database. API controllers call services; services interact with domain classes and repositories.
2. **Encapsulation**: Domain entities must maintain private fields with getters and domain mutation methods that enforce validation.
3. **Polymorphic Dispatch**: Event visibility logic belongs in `Event.isVisibleTo(student)` overrides, avoiding type-checking switches.
4. **Centralized Access Control**: All permission decisions must pass through `PermissionService` on the server.
5. **Security & Secrets**: Never commit passwords, tokens, or Aiven connection strings. Store secrets exclusively in `.env` files (ignored by Git).
