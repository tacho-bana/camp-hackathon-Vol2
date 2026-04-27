import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.db.engine import AsyncSessionLocal
from app.routers import auth, game
from app.security import delete_expired_sessions


async def _session_cleanup_loop() -> None:
    interval_sec = max(settings.session_cleanup_interval_minutes, 1) * 60
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await delete_expired_sessions(session)
        except Exception:
            # Cleanup should not bring the API process down.
            pass
        await asyncio.sleep(interval_sec)


@asynccontextmanager
async def lifespan(_: FastAPI):
    cleanup_task = asyncio.create_task(_session_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="Game API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(game.router)
# app.include_router(structures.router)
# app.include_router(enemies.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/health/db")
async def health_db():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
        )
        tables = [row[0] for row in result.fetchall()]
    return {"status": "ok", "tables": tables}
