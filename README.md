# Smart Access Management System

![Smart Access Management System](docs/images/hero.png)

> AI-powered face recognition system for attendance tracking and access control.

Smart Access Management System is a full-stack computer vision application that combines face recognition, person enrollment, camera management, role-based access control, and activity auditing.

The system provides dedicated recognition stations where enrolled persons can be identified using facial embeddings, while administrators can manage people, cameras, users, settings, and recognition activity.

---

## Features

### Face Recognition

- MTCNN face detection
- InceptionResnetV1 face embeddings
- 512-dimensional face embeddings
- Euclidean-distance based matching
- Configurable recognition threshold
- Single-face validation
- Auto and manual recognition modes

### Person Management

- Enroll persons with name, CNIC, and photo
- Automatic duplicate-face detection
- Search and manage enrolled persons
- Replace person photos
- Soft deletion while preserving historical records

### Camera Management

- Create and configure cameras
- Enable or disable cameras
- Auto / Manual recognition mode
- Online / Offline / Disabled status
- Heartbeat-based camera presence tracking
- Camera-level recognition configuration

### Activity & Auditing

- Recognition event history
- Person activity tracking
- Date-range filtering
- Activity search
- CSV export
- Recognition details including person, camera, timestamp, and match distance

### Authentication & RBAC

- JWT-based authentication
- Argon2 password hashing
- Super Admin, Admin, and Operator roles
- Permission-based authorization
- Progressive temporary account lockout
- Forced password changes
- Token invalidation after password changes

---

## Dashboard

![Smart Access Management System Dashboard](docs/images/dashboard.png)

---

## How Face Recognition Works

The recognition pipeline follows a straightforward embedding-based approach:

```text
Camera / Image
      │
      ▼
MTCNN Face Detection
      │
      ▼
160 × 160 Face Crop
      │
      ▼
InceptionResnetV1
(VGGFace2)
      │
      ▼
512-D Face Embedding
      │
      ▼
Euclidean Distance
      │
      ▼
Best Matching Person
      │
      ▼
Recognition Threshold
      │
   ┌──┴────┐
   ▼       ▼
 Match   No Match
   │
   ▼
Recognition Event
```

![Face Recognition Result](docs/images/recognition.png)

MTCNN detects and extracts the face, InceptionResnetV1 generates a 512-dimensional embedding, and the resulting vector is compared with enrolled person embeddings using Euclidean distance.

The default recognition threshold is `1.0`. A separate duplicate-face threshold of `0.75` is used during enrollment. Both thresholds can be configured through System Settings.

---

## Architecture

The application follows a layered full-stack architecture:

```text
React + TypeScript Frontend
            │
            ▼
       FastAPI Backend
            │
      ┌─────┴─────┐
      │           │
   Services   Face Recognition
      │           │
      └─────┬─────┘
            │
            ▼
       Repositories
            │
            ▼
        PostgreSQL
```

### Frontend

The frontend is built with React and TypeScript and provides:

- Dashboard
- Person management
- Camera management
- Recognition station
- Activity monitoring
- User and role management
- System settings
- Protected routes and permission-aware UI

### Backend

The FastAPI backend is organized around application services and repositories.

Core areas include:

- Authentication
- Person management
- Enrollment
- Camera management
- Recognition
- Activity tracking
- User management
- Dashboard
- System settings

### Database

PostgreSQL stores:

- Admin accounts
- Persons and face embeddings
- Cameras
- Recognition events
- Person activities
- System settings

Database schema changes are managed using Alembic migrations.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Uvicorn |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Face Detection | MTCNN |
| Face Embeddings | InceptionResnetV1 / VGGFace2 |
| Deep Learning | PyTorch, torchvision |
| Image Processing | Pillow |
| Authentication | JWT / PyJWT |
| Password Hashing | Argon2 / pwdlib |
| Testing | pytest |
| Frontend Hosting | Vercel |
| Demo Backend Exposure | Cloudflare Quick Tunnel |

---

## Authentication & Security

The system implements application-level authentication and authorization controls.

### JWT Authentication

- HTTP Bearer authentication
- HS256 signed tokens
- Configurable token lifetime
- Token versioning
- Previous tokens can be invalidated after password changes

### Password Security

- Argon2 password hashing
- Minimum password length requirements
- Password change enforcement

### Account Protection

After repeated failed login attempts, accounts can be temporarily locked using progressive lockout durations.

### Role-Based Access Control

The system uses three roles:

```text
Super Admin
     │
     ├── Full system control
     │
Admin
     │
     ├── User, camera, activity and configuration management
     │
Operator
     │
     └── Operational access to persons, cameras and recognition
```

Authorization is enforced by the backend rather than relying only on frontend visibility.

---

## Project Structure

```text
smart-access-management-system/
│
├── app/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   └── services/
│
├── Frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vercel.json
│
├── alembic/
│   └── versions/
│
├── tests/
│
├── docs/
│   └── images/
│       └── hero.png
│
├── requirements.txt
├── pyproject.toml
└── alembic.ini
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Optional CUDA-compatible GPU for accelerated face recognition

### Backend

Create and activate a virtual environment:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Linux / macOS:

```bash
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/smart_access
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Run database migrations:

```bash
alembic upgrade head
```

Start the FastAPI backend using the project's configured application entry point.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend runs through Vite and communicates with the FastAPI backend.

---

## Testing

The project includes a dedicated pytest test suite with a separate test database and reusable test fixtures.

Run the complete test suite with:

```bash
pytest -q -ra
```

You can also run an individual test module:

```bash
pytest tests/test_recognition.py -v
```

---

## Deployment

The frontend is hosted on Vercel.

For demonstrations, the FastAPI backend runs locally and can be temporarily exposed using Cloudflare Quick Tunnel.

```text
Vercel
   │
   ▼
React Frontend
   │
   ▼
Cloudflare Quick Tunnel
   │
   ▼
Local FastAPI Backend
   │
   ▼
PostgreSQL
```

The Quick Tunnel provides a temporary public endpoint for demonstrations rather than a permanent backend deployment.

---

## Engineering Highlights

The project demonstrates several practical AI/software engineering decisions:

- Embedding-based face recognition instead of direct image comparison
- Separate service and repository layers
- Runtime-configurable recognition thresholds
- Single-face validation for deterministic recognition behavior
- Soft deletion for preserving historical records
- Camera heartbeat monitoring
- Backend-enforced RBAC
- Alembic database migrations
- Dedicated automated test suite
- Responsive React frontend

---

## Current Limitations

This project is a portfolio-focused implementation and has known limitations:

- Recognition currently supports one face at a time
- Recognition compares against enrolled embeddings using a full scan
- Backend demonstration currently runs from a local environment
- No face liveness / anti-spoofing detection
- No real-time notification integrations
- No MFA
- No production-scale observability or load-testing infrastructure

---

## Future Improvements

Potential improvements include:

- Vector similarity search using pgvector / ANN
- Face liveness detection
- RTSP / WebRTC camera streams
- Real-time recognition notifications
- Batch person enrollment
- End-to-end testing
- Load testing
- Containerized deployment
- Production monitoring and observability

---

## Author

**Zohab Aamir**

AI / ML Engineer

GitHub: **@zohabaamir-ai**