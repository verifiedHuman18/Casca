# Member B — Events and Calendar Backend

**Repository area:** `backend/src/events`
**Feature branch:** `feature/member-b-events-calendar`

## Scope

This module implements:

- `CampusEvent`, `ClubEvent`, and `SectionEvent` domain classes and `EventFactory`.
- `EventService` for event creation, editing, rescheduling, cancellation, campus requests, approval, rejection, and resubmission.
- `CalendarService` and `CalendarFilter`.
- `EventRepository` and PostgreSQL implementation `PgEventRepository`.
- Express controllers and routes under `/api`.
- PostgreSQL migration at `backend/sql/001_create_events.sql`.
- `EventPermissionGateway` and an adapter to the repository's existing `PermissionService`.

The existing `backend/src/index.ts` is preserved. `backend/src/server.ts` exports an application factory; it does not replace the existing entry point.

## Event model

Scopes: `CAMPUS`, `CLUB`, `SECTION` (aligned with shared `ScopeType`).

Statuses: `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `CANCELLED`.

Club visibility: `PUBLIC`, `MEMBERS_ONLY`.

Date-time input must include an explicit timezone. PostgreSQL stores event times in `TIMESTAMPTZ`. Venue/time overlap is returned as a warning and does not block creation or editing.

## Authorization and integration

The event service depends on `EventPermissionGateway` in `backend/src/events/permissions/EventPermissionGateway.ts`. `PermissionServiceEventGateway.ts` adapts the existing Member A `PermissionService`. The HTTP layer maps the trusted shared `AuthUser` supplied by upstream authentication middleware to the event actor. Client-supplied identity or role fields must never be used as authorization evidence.

**Current limitation:** the repository's existing `PermissionService` is still a phase-one stub. It currently grants publishing only to Admins, denies campus-event requests, and uses only its stub edit/approval rules. The adapter is wired and type-safe, but CR/club-officer publishing and campus request permissions remain incomplete until Member A supplies the real scope- and assignment-aware permission implementation. `canViewApprovalQueue` currently delegates to `canManageRegistry`, which is Admin-only in the current stub. See `MEMBER_B_INTEGRATION.md`.

## Application integration

`backend/src/server.ts` exports `createApp(pool, permissionGateway, authenticationMiddleware)`. The main application must:

1. Reuse the team's PostgreSQL pool.
2. Supply trusted authentication middleware that populates `req.user` with the shared `AuthUser`.
3. Supply the permission gateway/adapter.
4. Mount the returned app/router in the team's main Express application.

Do not replace `backend/src/index.ts` or assume the feature factory is already mounted in the running team server. Confirm the final mount point with the backend owner before deployment.

## HTTP API

All routes are under `/api` and require upstream authentication.

| Method  | Path                              | Purpose                                          |
| ------- | --------------------------------- | ------------------------------------------------ |
| `POST`  | `/api/events`                     | Create an event in a permitted scope             |
| `POST`  | `/api/events/campus-requests`     | Request a campus event for Admin approval        |
| `GET`   | `/api/events/my-requests`         | List the authenticated actor's campus requests   |
| `GET`   | `/api/events/approval-queue`      | List pending requests for an authorized approver |
| `POST`  | `/api/events/:eventId/approve`    | Approve a pending campus request                 |
| `POST`  | `/api/events/:eventId/reject`     | Reject a pending request; body requires `reason` |
| `POST`  | `/api/events/:eventId/resubmit`   | Resubmit a rejected request                      |
| `PATCH` | `/api/events/:eventId`            | Update event details                             |
| `POST`  | `/api/events/:eventId/reschedule` | Change event start/end times                     |
| `POST`  | `/api/events/:eventId/cancel`     | Cancel and retain the database record            |
| `GET`   | `/api/calendar`                   | Read events visible to the authenticated actor   |

Event route parameters are validated as UUIDs before repository access. Create/update responses include `event` and `clashWarnings`.

## Business rules

- A section event targets the authenticated actor's own section; the client cannot select another section.
- Club publishing is checked against the exact club ID.
- Club visibility defaults to `PUBLIC`; `MEMBERS_ONLY` is supported.
- Direct campus-event creation requires campus publishing permission. Otherwise, the requester uses the campus-request endpoint.
- Campus requests begin in `PENDING_APPROVAL` and are excluded from the normal calendar.
- A requester cannot approve or reject their own request.
- Approval makes a request `ACTIVE`; rejection stores a reason and sets `REJECTED`.
- Only the original requester can resubmit a rejected request; request permission is checked again.
- Cancellation sets `CANCELLED`; the database row is retained.
- Club visibility is applied when building a viewer's calendar.
- Section events are visible to the viewer's own section and explicitly selected additional sections.
- Venue/time clashes are informational warnings, not hard validation failures.

## Local verification

Run from the repository root:

```bash
npm run typecheck
npm run build --workspace=@senoom/backend
npm test --workspace=@senoom/backend
npm run db:migrate --workspace=@senoom/backend
npm run db:smoke --workspace=@senoom/backend
```

Migration and smoke tests require a valid local `backend/.env`. Do not commit `.env`; use `backend/.env.example` as the configuration template.

Latest local verification:

- Prettier check passed.
- ESLint reported zero warnings and zero errors.
- Workspace typecheck passed.
- Backend build passed.
- Unit tests: 3 files, 26 tests passed.
- PostgreSQL smoke test: 7 checks passed (create, retrieve, calendar inclusion, update, reschedule, persisted cancellation, and hiding cancelled events); temporary event cleaned up.
- `npm audit`: 0 vulnerabilities.

These checks do not mean the HTTP routes have been integration-tested against the team's final authentication and permission stack.

## Remaining integration and hardening

1. **Real permission rules:** replace the current `PermissionService` stub with current role-assignment and exact-scope permission checks; test CR, club-officer, and Admin cases.
2. **Main-server mounting:** wire `createApp` into the team's actual Express server with trusted authentication and the real permission adapter.
3. **Audit trail:** add records for important event actions if required by final team requirements. Approval metadata is stored on the event; it is not a general audit log.
4. **Approval concurrency:** protect decisions against two Admins deciding the same pending request concurrently (for example, row locking or a conditional state update).
5. **Calendar query efficiency:** `findAll()` currently loads all events and section-event hydration performs extra section lookups. Consider SQL-side filtering and batched section loading.
6. **HTTP integration tests:** add route/database/auth integration tests when the team's test environment is ready.

## Security notes

- Never trust `userId`, `isAdmin`, section IDs, or club membership IDs from event request bodies.
- Do not deploy a development identity adapter or bypass the actual authentication middleware.
- Keep `.env`, credentials, and database dumps out of Git.
