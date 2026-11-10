# Member B integration contract

This document describes the integration points between the Events/Calendar module and the rest of the Campus Management Platform.

## 1. Member A — permission implementation

The event module exposes `EventPermissionGateway` and includes `PermissionServiceEventGateway`, which adapts the current `PermissionService`.

Member A's final permission implementation must enforce these rules using **current** role assignments and the exact scope/target:

| Gateway method                          | Required behavior                                                    |
| --------------------------------------- | -------------------------------------------------------------------- |
| `canPublish(actor, CLUB, clubId)`       | Active club position for that exact club with `CREATE_CLUB_EVENT`    |
| `canPublish(actor, SECTION, sectionId)` | CR authority for that exact section                                  |
| `canPublish(actor, CAMPUS)`             | Admin's direct campus publishing authority                           |
| `canRequestCampusEvent(actor)`          | Active office-bearer permission `REQUEST_CAMPUS_EVENT`               |
| `canApprove(actor, event)`              | Admin approval authority; requester cannot approve their own request |
| `canEdit(actor, event)`                 | Creator OR current same-scope publisher OR Admin                     |
| `canViewApprovalQueue(actor)`           | Admin authority                                                      |

**Current state:** the adapter exists, but the repository's `PermissionService` remains a phase-one stub. It currently allows publishing only to Admins, denies campus-event request permission, and does not yet implement the complete scope-aware role-assignment rules. CR/club-officer permissions are incomplete until Member A's implementation is integrated and tested.

The authenticated principal must come from trusted server middleware. Never trust client-supplied `isAdmin`, `sectionId`, `clubMembershipIds`, or `userId`.

## 2. Member C — frontend API contract

### Create a club event

`POST /api/events`

```json
{
  "scope": "CLUB",
  "title": "Coding workshop",
  "description": "Intro session",
  "venue": "Lab 2",
  "startTime": "2026-12-01T10:00:00+05:30",
  "endTime": "2026-12-01T12:00:00+05:30",
  "clubId": "club-id",
  "clubVisibility": "PUBLIC"
}
```

For a section event send `"scope": "SECTION"`. The server derives the target section from the authenticated actor; the client must not choose another section.

### Request a campus event

`POST /api/events/campus-requests`

Send `title`, `description`, `venue`, `startTime`, and `endTime`.

### Calendar

`GET /api/calendar?from=...&to=...&clubIds=club-1&sectionIds=section-2`

`sectionIds` adds explicitly selected sections to the viewer's own section calendar; it does not make the filter exclusive.

### Requests and approval queue

- `GET /api/events/my-requests`
- `GET /api/events/approval-queue`

### Decisions and event actions

- `POST /api/events/:eventId/approve`
- `POST /api/events/:eventId/reject` — body: `{ "reason": "..." }`
- `POST /api/events/:eventId/resubmit` — editable event fields
- `PATCH /api/events/:eventId` — editable event fields
- `POST /api/events/:eventId/reschedule` — body: `{ "startTime": "...", "endTime": "..." }`
- `POST /api/events/:eventId/cancel`

Create/update responses contain `{ event, clashWarnings }`. Clash warnings are informational; the UI should show a warning but allow the user to continue.

## 3. Team decisions to confirm

1. Confirm exact Member A identifier types and add foreign keys after the shared schema is finalized.
2. Confirm whether `description` must be non-empty. The create input currently requires the property but accepts an empty string.
3. Confirm the calendar filter semantics with the design owner. Current section filter behavior adds selected sections to the viewer's own section.
4. Wire audit logging if the team implements the audit requirement.
5. Push notifications are not included in this v1 module.
6. Confirm the main-server mount point and authentication middleware contract before enabling the API in the full application.

## 4. Verification boundary

The current automated tests cover domain, service, and calendar-filter behavior (26 unit tests). The PostgreSQL smoke script covers basic persistence and calendar behavior (7 checks). These checks do not replace full HTTP integration tests with the final authentication middleware and permission implementation.
