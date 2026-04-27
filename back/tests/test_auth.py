import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from app.db.models import UserSession
from app.security import delete_expired_sessions
from tests.fakes import FakeAsyncSession, app_client as auth_client


def test_register_sets_session_and_csrf_cookies():
    async def run():
        async with auth_client() as (client, db):
            response = await client.post(
                "/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "password123",
                    "name": "tester",
                },
            )

            assert response.status_code == 201
            assert response.json()["message"] == "Registered successfully"
            assert response.cookies.get("access_token")
            assert response.cookies.get("csrf_token")
            assert len(db.sessions_by_id) == 1

    asyncio.run(run())


def test_me_works_with_session_cookie():
    async def run():
        async with auth_client() as (client, _db):
            await client.post(
                "/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "password123",
                    "name": "tester",
                },
            )

            response = await client.get("/auth/me")

            assert response.status_code == 200
            assert response.json()["email"] == "test@example.com"

    asyncio.run(run())


def test_login_rejects_invalid_password():
    async def run():
        async with auth_client() as (client, _db):
            await client.post(
                "/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "password123",
                    "name": "tester",
                },
            )
            client.cookies.clear()

            response = await client.post(
                "/auth/login",
                json={
                    "email": "test@example.com",
                    "password": "wrongpass123",
                },
            )

            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid email or password"

    asyncio.run(run())


def test_logout_requires_csrf_header():
    async def run():
        async with auth_client() as (client, _db):
            await client.post(
                "/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "password123",
                    "name": "tester",
                },
            )

            response = await client.post("/auth/logout")

            assert response.status_code == 403
            assert response.json()["detail"] == "CSRF token is required"

    asyncio.run(run())


def test_logout_deletes_session_and_cookies():
    async def run():
        async with auth_client() as (client, db):
            await client.post(
                "/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "password123",
                    "name": "tester",
                },
            )
            csrf_token = client.cookies.get("csrf_token")
            session_id = client.cookies.get("access_token")

            response = await client.post(
                "/auth/logout",
                headers={"X-CSRF-Token": csrf_token},
            )

            assert response.status_code == 200
            assert session_id not in db.sessions_by_id
            assert (await client.get("/auth/me")).status_code == 401

    asyncio.run(run())


def test_delete_expired_sessions_removes_only_expired_rows():
    db = FakeAsyncSession()
    now = datetime.now(UTC)

    active_session = UserSession(
        session_id="active",
        user_id=str(uuid.uuid4()),
        csrf_token="csrf-active",
        expires_at=now + timedelta(minutes=10),
    )
    expired_session = UserSession(
        session_id="expired",
        user_id=str(uuid.uuid4()),
        csrf_token="csrf-expired",
        expires_at=now - timedelta(minutes=10),
    )
    db.add(active_session)
    db.add(expired_session)

    deleted_count = asyncio.run(delete_expired_sessions(db))

    assert deleted_count == 1
    assert "expired" not in db.sessions_by_id
    assert "active" in db.sessions_by_id
