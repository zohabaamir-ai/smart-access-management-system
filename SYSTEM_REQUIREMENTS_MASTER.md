# Smart Access Management System — Master System Requirements

**Status:** Requirements discovery checkpoint (historical).
**Purpose:** Original product-behaviour source of truth captured before implementation.

> **Scope note (post-implementation):** two items discussed below did
> **not** ship in V1 — the Notifications subsystem (§15, "Notification
> Preferences") and any physical Entry Terminal / device-pairing concept.
> The product uses **Cameras** and a public Recognition Station only.
> Everything else in this document still reflects the shipped V1 intent.

## 1. System Purpose
A generic, scalable face-recognition monitoring system. It is not limited to a university, company, or household. The current goal is a complete deployable showcase that demonstrates a realistic recognition workflow and is structured cleanly enough for later real-world adaptation.

Recognition currently means **recognition/identification**, not physical access control. No gate, door, lock, or other hardware action is required after recognition.

## 2. Actors

### Management Users
- Super Admin
- Admin
- Operator

### Persons
People whose faces are enrolled and recognized. A management user may also be enrolled as a Person; these remain separate concepts/records.

## 3. Core Recognition Flow
1. Authorized management user enrolls a Person.
2. Enrollment includes name, unique CNIC, and photograph.
3. System stores the Person and required face representation.
4. Person appears before a Camera.
5. Camera captures an image and sends it to the recognition system.
6. Face-recognition model compares it against enrolled Persons.
7. If recognized, a Recognition Event is created.
8. Event records Person, Camera, and timestamp.
9. Event appears in Activity.

## 4. Camera
A Camera is the recognition point that captures an image and sends it to the recognition system.

### Camera data
- System-generated ID
- Name
- Location

### Camera management
Super Admin and Admin can:
- Add
- Edit
- Disable
- Decommission/Delete

Operator cannot manage camera configuration.

### Camera status
The system should support concepts such as:
- Online
- Offline
- Disabled
- Error

Automatic security notifications for camera failures are a Notifications decision, not yet finalized.

### Open Camera
Two intentionally distinct uses:
1. **Management Preview Camera:** management selects a camera and opens its preview simulating what the camera sees.
2. **Dedicated Camera URL:** an active camera has a dedicated slug such as `/camera/main-gate`, usable without entering the management dashboard. This is especially useful for the deployed showcase.

Management Preview Camera doesn't use the recognition pipeline and create the same Recognition Event. Public camera uses recognition and create Recogination Events and it must not expose management/configuration functionality.

## 5. Persons
A Person is an identity enrolled for recognition.

Core data:
- Name
- CNIC
- Photograph

### Permissions
| Action         | Super Admin | Admin | Operator |
|----------------|-------------|-------|----------|
| View           | Yes         | Yes   |      Yes |
| View photo/CNIC| Yes         | Yes   |      Yes |
| Enroll         | Yes         | Yes   |      Yes |
| Edit           | Yes         | Yes   |       No |
| Delete         | Yes         | Yes   |       No |


## 6. Activity
Activity is the historical recognition/event log.

It answers: **What happened?**

Typical information:
- Person
- CNIC/identification where appropriate
- Date
- Time
- Camera
- Recognition information as appropriate

All management roles can:
- View
- Search/filter
- View relevant Person details
- View relevant Camera details

Super Admin/Admin can export/download Activity data. Operator cannot export/download it.

Export should use the currently selected Activity filters. Activity is historical/audit information and should not be casually edited/deleted from the Activity interface.

## 7. Reports
A separate Reports page is **not currently required**.

The Reports concept is merged into Activity:
> **Activity = View + Filter + Export**

A future Reports/Analytics module may be introduced only if a real requirement emerges, such as formal periodic summaries, advanced analytics, PDF reports, or scheduled reports.

## 8. Dashboard
Dashboard answers:
> **What is happening in my system?**

It is an overview layer, not a replacement for Activity.

Potential baseline information:
- Total registered Persons
- Recognitions today
- Unique Persons recognized today
- Active Cameras
- Recognition activity
- Camera status
- Recent Activity

Exact metrics and visual composition remain pending final review.

Dashboard should not become Person management, Camera configuration, the full Activity table, User management, System Settings, or detailed reporting.

## 9. Roles

### Super Admin
The current showcase configuration has one Super Admin controlled by the owner. The architecture should remain scalable enough for future intentional support of multiple Super Admins.

Super Admin has highest authority and can manage:
- Admins
- Operators
- Persons
- Cameras
- Activity/export
- Users/roles
- System Settings
- Other system-level management actions

Current showcase policy:
- Only the owner is Super Admin.
- Lower roles cannot create a Super Admin.
- Lower roles cannot escalate themselves or others beyond their authority.
- Super Admin cannot be disabled by Admin/Operator.

### Admin
Admin can:
- Manage Persons
- Manage Cameras
- Manage Operators
- View/export Activity
- Use recognition interfaces

Admin cannot:
- Create Admin or Super Admin
- Change another user's role
- Manage Super Admin
- Override Super Admin authority

### Operator
Operator is the monitoring/operational role.

Operator can:
- View Persons
- View Person photo/CNIC
- Enroll Persons
- View/search/filter Activity
- Use/Open Cameras
- Participate in recognition/testing

Operator cannot:
- Edit/delete Persons
- Manage Cameras
- Access Users management
- Export Activity
- Access System Settings

## 10. Users Management
Users are management accounts, not Persons.

### Hierarchy
Super Admin:
- Create Admin
- Create Operator
- Edit/manage users
- Assign/change roles
- Activate/disable
- Reset/unlock
- Delete
- Full management authority

Admin:
- Create Operator
- Manage Operators within their authority
- Cannot create Admin
- Cannot promote Operator to Admin
- Cannot change another Admin's role
- Cannot manage Super Admin

Operator:
- Does not see/access Users management.

A lower role must never be able to escalate itself or another account beyond its authority.

## 11. Management User Profile
Each management account has:
- Full/Original Name
- Username
- Display Name
- Profile Photo
- Role

Username and Display Name are separate. Display Name may be used in the application header.

Profile photo may also be displayed in Users management.

Management User Profile Photo and Person Enrollment Photo are separate data concepts even when they belong to the same human.

## 12. Authentication
Authentication applies to Management Users.

Flow:
> Login → credential validation → password state check → System OR Change Password

### Failed login protection
Progressive temporary lockout is preferred over automatic permanent disabling.
- Failed attempts are tracked.
- Current baseline: 5 failed attempts triggers temporary lockout.
- First lockout is approximately 15 minutes.
- Repeated lockouts may escalate to longer temporary periods.
- Exact escalation timings remain an implementation/security decision.

Do not automatically permanently disable an account solely because of repeated failed logins.

Super Admin may receive temporary brute-force protection but should not be automatically permanently disabled.

Authentication should not expose whether a username exists. Public side-effecting lock-status behavior should not be allowed.

## 13. Password / Change Password
### Forced change
If `must_change_password` is true:
> Login → valid credentials → Change Password → System

Normal system access is blocked until required change is completed.

### Voluntary change
Logged-in users can change their password using current password, new password, and confirmation.

Super Admin:
- Does not require forced password change in intended configuration.
- Does not require temporary password.
- Can voluntarily change password at any time.

After successful password change, existing authentication tokens/sessions should be invalidated.

## 14. Settings
### My Preferences
Individual user experience preferences, such as theme/interface preferences.

### System Settings
Super Admin only. Intended for system-level configuration affecting recognition/security/operation. Exact catalog is pending.

Admin and Operator must not see System Settings.

### About
Available to everyone and explains the system/product.


## 15. Out of Scope
Currently not required:
- Physical gate/door opening
- Access-control hardware actuation
- Real CCTV infrastructure
- Physical camera installation
- Real camera stream integration
- External hardware control after recognition
- Commercial SaaS/multi-tenant architecture
- Advanced reporting unless justified
- Notification for every system event
- Privacy masking of Person CNIC/photo from Operators

## 16. Terminology
Use:
- **Person** — identity enrolled for recognition
- **Management User** — account holder operating the system
- **Camera** — recognition point capturing an image
- **Recognition Event** — successful recognition associated with Person, Camera, timestamp
- **Activity** — historical event/recognition log
- **Dashboard** — system overview
- **Users** — management-account administration
- **Settings** — preferences, system configuration, About

This document is the product-level checkpoint and should be used in future before major implementation work.
