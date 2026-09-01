import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth_routes import (router as auth_router,)

from app.api.routes.person_routes import (router as person_router,)

from app.api.routes.recognition_routes import (router as recognition_router,)

from app.api.routes.activity_routes import (router as activity_router,)

from app.api.routes.dashboard_routes import (router as dashboard_router,)

from app.api.routes.camera_routes import (router as camera_router,)

from app.api.routes.user_routes import (router as user_router,)

from app.api.routes.settings_routes import (router as settings_router,)


app = FastAPI(
    title="Face Recognition Attendance System",
    
)

app.mount(
    "/uploads",
    StaticFiles(
        directory="app/uploads"
    ),
    name="uploads",
)

# Allowed browser origins. Production sets CORS_ALLOW_ORIGINS to a
# comma-separated list (e.g. the deployed frontend URL); when it is
# absent, local development defaults apply.
_origins = [
    o.strip()
    for o in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
    if o.strip()
] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(person_router)

app.include_router(recognition_router)

app.include_router(activity_router)

app.include_router(dashboard_router)

app.include_router(camera_router)

app.include_router(user_router)

app.include_router(settings_router)

app.include_router(auth_router)