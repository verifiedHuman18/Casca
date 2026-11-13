# System Architecture & UML Design Guide

**Campus Management Platform (Casca)** — Object-Oriented Software Engineering Architecture & Specification.

---

## 1. Architectural Layers & Component Architecture

The platform follows a strict **4-layer Clean Architecture** with unidirectional dependencies pointing inwards towards domain invariants:

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Expo / React Native)"]
        UI_Screens["Views: Day, Month, EventDetail, AuthScreen"]
        UI_Drawers["Drawers: SwipeableDrawer, ApprovalQueue, MyRequests, CreateEvent"]
        UI_API["API Client: client/src/services/api.ts"]
    end

    subgraph Transport ["Controller / Transport Layer"]
        AuthCtrl["AuthController (/api/auth)"]
        EventCtrl["EventController (/api/events)"]
        CalCtrl["CalendarController (/api/calendar)"]
        Middleware["requireAuth & requirePermission Middleware"]
    end

    subgraph Application ["Application / Service Layer"]
        AuthSvc["AuthService"]
        PermSvc["PermissionService"]
        EventSvc["EventService"]
        CalSvc["CalendarService"]
        Factory["EventFactory"]
    end

    subgraph DomainModel ["Domain Layer (Pure OOP)"]
        UserClass["User (abstract)"]
        StudentClass["Student"]
        AdminClass["Admin"]
        EventClass["Event (abstract)"]
        CampusEventClass["CampusEvent"]
        ClubEventClass["ClubEvent"]
        SectionEventClass["SectionEvent"]
        RoleAssign["RoleAssignment (Association Class)"]
        ClubClass["Club"]
        SectionClass["Section"]
        PosClass["Position"]
    end

    subgraph Persistence ["Persistence Layer (PostgreSQL / Aiven)"]
        PgRepos["Postgres Repositories (Student, Club, Position, RoleAssignment, Event)"]
        AivenDB[("PostgreSQL 16 Cloud DB (TLS Encrypted)")]
    end

    UI_Screens --> UI_Drawers
    UI_Drawers --> UI_API
    UI_API --> AuthCtrl
    UI_API --> EventCtrl
    UI_API --> CalCtrl

    AuthCtrl --> Middleware
    EventCtrl --> Middleware
    CalCtrl --> Middleware

    Middleware --> PermSvc
    AuthCtrl --> AuthSvc
    EventCtrl --> EventSvc
    CalCtrl --> CalSvc

    AuthSvc --> UserClass
    AuthSvc --> PgRepos
    EventSvc --> Factory
    EventSvc --> PermSvc
    EventSvc --> PgRepos
    CalSvc --> EventClass
    CalSvc --> PgRepos

    Factory --> CampusEventClass
    Factory --> ClubEventClass
    Factory --> SectionEventClass

    UserClass --> StudentClass
    UserClass --> AdminClass
    EventClass --> CampusEventClass
    EventClass --> ClubEventClass
    EventClass --> SectionEventClass
    StudentClass --> RoleAssign
    RoleAssign --> PosClass
    RoleAssign --> ClubClass
    RoleAssign --> SectionClass

    PgRepos --> AivenDB
```

---

## 2. Complete UML Class Diagram

The object model reflects pure Object-Oriented principles, leveraging inheritance, polymorphic dispatch, encapsulation, and association classes:

```mermaid
classDiagram
    class User {
        <<abstract>>
        #string userId
        #string name
        #string email
        #string passwordHash
        +getUserId() string
        +getName() string
        +getEmail() string
        +verifyPassword(plain) boolean
    }

    class Student {
        -string enrollmentNo
        -string course
        -Section section
        +getEnrollmentNo() string
        +getCourse() string
        +getSection() Section
        +getYear() number
    }

    class Admin {
        -string adminLevel
        +getAdminLevel() string
    }

    class Position {
        -string positionId
        -string name
        -ScopeType scopeType
        -Permission[] permissions
        +getPositionId() string
        +getName() string
        +getScopeType() ScopeType
        +hasPermission(perm) boolean
    }

    class RoleAssignment {
        -string assignmentId
        -string userId
        -string positionId
        -string clubId
        -string sectionId
        -Date assignedOn
        -Date endsOn
        +isActive() boolean
        +coversTarget(scope, targetId) boolean
    }

    class Club {
        -string clubId
        -string name
        -string description
        +getClubId() string
        +getName() string
    }

    class Section {
        -string sectionId
        -string course
        -string label
        -number year
        +getName() string
    }

    class Event {
        <<abstract>>
        #string eventId
        #string title
        #string description
        #string venue
        #Date startTime
        #Date endTime
        #string createdBy
        #EventStatus status
        #string approvedBy
        #Date decidedOn
        #string decisionNote
        +getStatus() EventStatus
        +reschedule(start, end) void
        +cancel() void
        +isVisibleTo(student)* boolean
        +canBeCreatedBy(user)* boolean
    }

    class CampusEvent {
        +isVisibleTo(student) boolean
        +canBeCreatedBy(user) boolean
    }

    class ClubEvent {
        -string clubId
        -ClubVisibility visibility
        +getClubId() string
        +getVisibility() ClubVisibility
        +isVisibleTo(student) boolean
        +canBeCreatedBy(user) boolean
    }

    class SectionEvent {
        -string[] targetSections
        +getTargetSections() string[]
        +isVisibleTo(student) boolean
        +canBeCreatedBy(user) boolean
    }

    User <|-- Student : extends
    User <|-- Admin : extends
    Student "1" *-- "0..*" RoleAssignment : holds
    RoleAssignment --> "1" Position : assigns
    RoleAssignment --> "0..1" Club : scoped to
    RoleAssignment --> "0..1" Section : scoped to
    Student --> "1" Section : enrolled in

    Event <|-- CampusEvent : extends
    Event <|-- ClubEvent : extends
    Event <|-- SectionEvent : extends
```

---

## 3. Event Lifecycle State Machine

Events transition through distinct states governed by role permissions and moderation workflows:

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL: Submit Campus Event Request (Club Officer)
    [*] --> ACTIVE: Direct Publish (Admin CAMPUS / CR SECTION / Officer CLUB)

    PENDING_APPROVAL --> ACTIVE: Admin Approves (Council Review)
    PENDING_APPROVAL --> REJECTED: Admin Rejects (with Decision Note)

    REJECTED --> PENDING_APPROVAL: Resubmit with Revisions (Club Officer)

    ACTIVE --> ACTIVE: Edit Metadata (Organizer / Admin)
    ACTIVE --> ACTIVE: Reschedule Schedule (+24h Shift)
    ACTIVE --> CANCELLED: Cancel Event (Destructive Confirmation)

    CANCELLED --> [*]
```

---

## 4. Sequence Diagrams

### 4.1 Student Self Sign-Up & Authentication Flow (UC-01, UC-13)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant AuthUI as AuthScreen (Client)
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant Hasher as PasswordHasher
    participant StudRepo as PostgresStudentRepository
    participant Token as JWT Service

    Student->>AuthUI: Fill Name, Enrollment No, Course, Section, Password
    AuthUI->>AuthCtrl: POST /api/auth/signup
    AuthCtrl->>AuthSvc: signUpStudent(name, enrollmentNo, sectionId, password)
    AuthSvc->>StudRepo: findByEnrollmentNo(enrollmentNo)
    StudRepo-->>AuthSvc: null (unique check ok)
    AuthSvc->>Hasher: hash(password)
    Hasher-->>AuthSvc: passwordHash
    AuthSvc->>StudRepo: createStudent(StudentRecord)
    StudRepo-->>AuthSvc: savedStudent
    AuthSvc->>Token: signToken(userId, type)
    Token-->>AuthSvc: JWT string
    AuthSvc-->>AuthCtrl: { token, user }
    AuthCtrl-->>AuthUI: 201 Created { token, user }
    AuthUI->>Student: Switch to Main Calendar (Authenticated Session)
```

### 4.2 Campus Event Proposal & Cultural Council Approval Flow (UC-14, UC-15)

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Club Officer
    actor Admin as Cultural Council Admin
    participant Client as Casca Mobile App
    participant EventCtrl as EventController
    participant EventSvc as EventService
    participant PermSvc as PermissionService
    participant EventRepo as PgEventRepository

    Note over Officer,Client: Step 1: Officer submits Campus Proposal
    Officer->>Client: Open Add Event Drawer -> Scope: Campus
    Client->>EventCtrl: POST /api/events/campus-requests (JWT Bearer)
    EventCtrl->>EventSvc: submitCampusRequest(actor, payload)
    EventSvc->>PermSvc: canRequestCampusEvent(actor, clubId)
    PermSvc-->>EventSvc: true (Officer position active)
    EventSvc->>EventRepo: createEvent(status: PENDING_APPROVAL)
    EventRepo-->>EventSvc: savedCampusEvent
    EventSvc-->>EventCtrl: Event entity (PENDING_APPROVAL)
    EventCtrl-->>Client: 201 Created

    Note over Admin,Client: Step 2: Admin reviews Approval Queue
    Admin->>Client: Open Approval Queue Drawer
    Client->>EventCtrl: GET /api/events/approval-queue (Admin JWT)
    EventCtrl->>EventSvc: getApprovalQueue(adminUser)
    EventSvc->>EventRepo: findPendingApproval()
    EventRepo-->>EventSvc: [CampusEvent, ...]
    EventSvc-->>Client: 200 OK [queueItems]
    Client->>Admin: Display Pending Proposal Cards

    Note over Admin,Client: Step 3: Admin Approves Event
    Admin->>Client: Tap "Approve Event"
    Client->>EventCtrl: POST /api/events/:id/approve (Admin JWT)
    EventCtrl->>EventSvc: approveEvent(adminUser, eventId)
    EventSvc->>PermSvc: canApprove(adminUser)
    PermSvc-->>EventSvc: true (Admin Role)
    EventSvc->>EventRepo: updateStatus(eventId, ACTIVE, adminId, timestamp)
    EventRepo-->>EventSvc: updatedEvent
    EventSvc-->>Client: 200 OK (Event is now ACTIVE)
    Client->>Admin: Remove from Queue, Reflect on Student Calendar
```

### 4.3 Event Mutation: Reschedule & Cancellation Flow (UC-08)

```mermaid
sequenceDiagram
    autonumber
    actor Organizer as Event Organizer / Admin
    participant Client as Casca Mobile App
    participant EventCtrl as EventController
    participant EventSvc as EventService
    participant PermSvc as PermissionService
    participant EventRepo as PgEventRepository

    Organizer->>Client: Open Event Detail -> Tap "Reschedule (+24h)"
    Client->>Client: Compute start + 24h, end + 24h
    Client->>EventCtrl: POST /api/events/:id/reschedule { startTime, endTime }
    EventCtrl->>EventSvc: rescheduleEvent(actor, eventId, startTime, endTime)
    EventSvc->>EventRepo: findById(eventId)
    EventRepo-->>EventSvc: existingEvent
    EventSvc->>PermSvc: canEdit(actor, existingEvent)
    PermSvc-->>EventSvc: true (Creator / Admin / Scope Officer)
    EventSvc->>EventRepo: updateSchedule(eventId, newStart, newEnd)
    EventRepo-->>EventSvc: updatedEvent
    EventSvc-->>Client: 200 OK { event }
    Client->>Organizer: Display updated session schedule

    Organizer->>Client: Tap "Cancel Event"
    Client->>EventCtrl: POST /api/events/:id/cancel
    EventCtrl->>EventSvc: cancelEvent(actor, eventId)
    EventSvc->>PermSvc: canEdit(actor, existingEvent)
    PermSvc-->>EventSvc: true
    EventSvc->>EventRepo: setStatus(eventId, CANCELLED)
    EventRepo-->>EventSvc: cancelledEvent
    EventSvc-->>Client: 200 OK
    Client->>Organizer: Show "Cancelled by organizer" badge
```

---

## 5. Core OOP Principles Applied

| OOP Principle         | Concrete Implementation in Casca                                                                                                                                                                                                                     |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inheritance**       | `User` (abstract base) &rarr; `Student`, `Admin`<br>`Event` (abstract base) &rarr; `CampusEvent`, `ClubEvent`, `SectionEvent`                                                                                                                        |
| **Polymorphism**      | `Event.isVisibleTo(student)` and `Event.canBeCreatedBy(user)` are abstract methods implemented independently by each event subclass. `CalendarService` aggregates collections of `Event` polymorphically without type inspection or runtime casting. |
| **Encapsulation**     | Private attributes, constructor-enforced invariants (immutable `enrollmentNo`, valid date intervals), and domain accessors.                                                                                                                          |
| **Abstraction**       | Repository interfaces conceal SQL queries from domain services; UI services hide HTTP network communication and offline caching details.                                                                                                             |
| **Association Class** | `RoleAssignment` bridges `Student` and `Position` while recording scope parameters (`clubId`, `sectionId`, `assignedBy`, `assignedOn`, `endsOn`).                                                                                                    |
| **Factory Pattern**   | `EventFactory` encapsulates scope-driven subclass instantiation (`CAMPUS`, `CLUB`, `SECTION`).                                                                                                                                                       |

---

## 6. Client Architecture & Quality Assurance

- **Framework**: React Native with Expo and TypeScript.
- **Deduplicated Date Utilities**: Shared date formatting and calendar grid generation located in `client/src/utils/date.ts`.
- **Reusable Gesture Drawer**: Shared swipeable sheet component `SwipeableDrawer.tsx` powering Profile/Settings, Event Authoring, Approval Queue, and My Requests.
- **Graceful Offline Degradation**: Rich fallback datasets and optimistic client state keep the app responsive even when disconnected from the backend.
- **Automated Testing**:
  - **Backend**: 11 test files, 96 unit tests covering domain classes, permission rules, and event services.
  - **Client**: 3 test suites, 36 unit tests covering date utilities, theme contrast tokens, and API offline workflows.
  - **Total**: 132 automated tests passing.
