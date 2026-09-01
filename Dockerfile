FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 torch==2.2.2 torchvision==0.17.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The upload dirs are excluded from the build context (.dockerignore) and
# are expected to be a mounted volume in production. Create them so the
# StaticFiles mount and photo writes work on a fresh container.
RUN mkdir -p app/uploads/persons app/uploads/profiles

EXPOSE 8000

# Apply DB migrations, then start the server. `&&` short-circuits: if
# `alembic upgrade head` exits non-zero the container stops and Uvicorn
# never starts (Render Free has no Pre-Deploy hook, so this is where
# migrations run). PORT is provided by Render; fall back to 8000 for
# local `docker run` / docker-compose.
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
