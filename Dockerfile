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

# Honour the platform-provided PORT (Render sets it); fall back to 8000
# for local `docker run` / docker-compose.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
