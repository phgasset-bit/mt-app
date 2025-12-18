# mt-app

Backend for the Media Tensión (MT) project.

Quick start

1. Create and activate venv:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run migrations (SQLite dev):

```powershell
$env:PYTHONPATH='C:\APPPYTHONMT\mt-app'
$env:DATABASE_URL='sqlite:///./dev.db'
python -m alembic upgrade head
```

3. Run tests:

```powershell
pytest -q
```

4. Run the app:

```powershell
uvicorn backend.main:app --reload
```

Files of interest

- `backend/models/models.py` — SQLAlchemy models
- `backend/routes/` — API endpoints
- `alembic/` — migrations (template + versions)

License: MIT
# MT App (scaffold)

Scaffold of the MT design application.

Quick start (development):

1. Copy `.env.example` to `.env` and fill values.
2. Build and run with Docker Compose:

```bash
docker-compose up --build
```

3. Run seed (if not executed automatically):

```bash
docker-compose run --rm backend python database/seed.py
```

API health: `http://127.0.0.1:8000/api/health` or proxied at `http://127.0.0.1:5000/api/health` when nginx is configured.
