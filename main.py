from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routes import tasks, auth

app = FastAPI(title="Tasks List")

# CORS — полезно, если фронт когда-нибудь будет на другом origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде лучше указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(auth.router)

# Статика
STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    """Отдаём SPA."""
    return FileResponse(STATIC_DIR / "index.html")
