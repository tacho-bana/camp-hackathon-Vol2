import asyncio
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.db.engine import get_db
from app.db.models import User, UserSession
from app.main import app
from app.security import delete_expired_sessions


class FakeResult:
    def __init__(self, scalar=None, rows=None):
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def first(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeAsyncSession:
    def __init__(self):
        self.users_by_id: dict[str, User] = {}
        self.users_by_email: dict[str, User] = {}
        self.sessions_by_id: dict[str, UserSession] = {}

    def add(self, obj):
        now = datetime.now(UTC)

        if isinstance(obj, User):
            if not obj.id:
                obj.id = str(uuid.uuid4())
            if obj.level is None:
                obj.level = 1
            if obj.xp is None:
                obj.xp = 0
            if obj.energy is None:
                obj.energy = 100
            if obj.created_at is None:
                obj.created_at = now
            self.users_by_id[obj.id] = obj
            self.users_by_email[obj.email] = obj
            return

        if isinstance(obj, UserSession):
            if obj.created_at is None:
                obj.created_at = now
            self.sessions_by_id[obj.session_id] = obj
            return

        raise TypeError(f"Unsupported object type: {type(obj)!r}")

    async def commit(self):
        return None

    async def refresh(self, _obj):
        return None

    async def execute(self, statement):
        if statement.__class__.__name__ == "Select":
            entity = statement.column_descriptions[0]["entity"]
            where = statement.whereclause
            if entity is User:
                key = where.left.key
                value = where.right.value
                if key == "email":
                    return FakeResult(scalar=self.users_by_email.get(value))
                if key == "id":
                    return FakeResult(scalar=self.users_by_id.get(value))

            if entity is UserSession:
                key = where.left.key
                value = where.right.value
                if key == "session_id":
                    return FakeResult(scalar=self.sessions_by_id.get(value))

        if statement.__class__.__name__ == "Delete" and statement.table.name == "sessions":
            where = statement.whereclause
            key = where.left.key
            deleted_ids: list[tuple[str]] = []

            if key == "session_id":
                value = where.right.value
                if value in self.sessions_by_id:
                    del self.sessions_by_id[value]
                    deleted_ids.append((value,))

            if key == "expires_at":
                deadline = where.right.value
                expired_ids = [
                    session_id
                    for session_id, session in self.sessions_by_id.items()
                    if session.expires_at <= deadline
                ]
                for session_id in expired_ids:
                    del self.sessions_by_id[session_id]
                    deleted_ids.append((session_id,))

            return FakeResult(rows=deleted_ids)

        raise AssertionError(f"Unsupported statement: {statement!r}")


@contextmanager
def auth_client():
    db = FakeAsyncSession()

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client, db
    finally:
        app.dependency_overrides.clear()


def test_register_sets_session_and_csrf_cookies():
    with auth_client() as (client, db):
        response = client.post(
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


def test_me_works_with_session_cookie():
    with auth_client() as (client, _db):
        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "tester",
            },
        )

        response = client.get("/auth/me")

        assert response.status_code == 200
        assert response.json()["email"] == "test@example.com"


def test_login_rejects_invalid_password():
    with auth_client() as (client, _db):
        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "tester",
            },
        )
        client.cookies.clear()

        response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrongpass123",
            },
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"


def test_logout_requires_csrf_header():
    with auth_client() as (client, _db):
        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "tester",
            },
        )

        response = client.post("/auth/logout")

        assert response.status_code == 403
        assert response.json()["detail"] == "CSRF token is required"


def test_logout_deletes_session_and_cookies():
    with auth_client() as (client, db):
        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "tester",
            },
        )
        csrf_token = client.cookies.get("csrf_token")
        session_id = client.cookies.get("access_token")

        response = client.post(
            "/auth/logout",
            headers={"X-CSRF-Token": csrf_token},
        )

        assert response.status_code == 200
        assert session_id not in db.sessions_by_id
        assert client.get("/auth/me").status_code == 401


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
