import os
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.engine import get_db
from app.routers import auth, game, structures

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5433/camp_test",
)

TABLES = [
    "battle_logs",
    "action_logs",
    "movement_logs",
    "enemies",
    "enemy_waves",
    "structures",
    "bases",
    "sessions",
    "users",
]


def _read_sql_statements() -> list[str]:
    sql_text = Path("db/init.sql").read_text()
    return [statement.strip() for statement in sql_text.split(";") if statement.strip()]


async def _apply_schema(engine) -> None:
    async with engine.begin() as conn:
        for statement in _read_sql_statements():
            await conn.execute(text(statement))


async def _truncate_tables(session: AsyncSession) -> None:
    joined_tables = ", ".join(TABLES)
    await session.execute(text(f"TRUNCATE TABLE {joined_tables} RESTART IDENTITY CASCADE"))
    await session.commit()


@pytest.fixture(scope="session")
def integration_db_url():
    return TEST_DATABASE_URL


@pytest_asyncio.fixture(scope="function")
async def integration_engine(integration_db_url):
    engine = create_async_engine(
        integration_db_url,
        future=True,
        poolclass=NullPool,
    )
    await _apply_schema(engine)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_sessionmaker(integration_engine):
    return async_sessionmaker(integration_engine, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def clean_database(db_sessionmaker):
    async with db_sessionmaker() as session:
        await _truncate_tables(session)
    yield


@pytest_asyncio.fixture
async def integration_client(db_sessionmaker):
    test_app = FastAPI()
    test_app.include_router(auth.router)
    test_app.include_router(game.router)
    test_app.include_router(structures.router)

    async def override_get_db():
        async with db_sessionmaker() as session:
            yield session

    test_app.dependency_overrides[get_db] = override_get_db

    @asynccontextmanager
    async def _client():
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            yield client

    try:
        yield _client
    finally:
        test_app.dependency_overrides.clear()
