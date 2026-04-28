import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.db.engine import get_db
from app.db.models import Base_ as UserBase
from app.db.models import Enemy, EnemyWave, Structure, User, UserSession
from app.routers import auth, game, structures


class FakeScalarResult:
    def __init__(self, items):
        self._items = list(items)

    def all(self):
        return list(self._items)


class FakeResult:
    def __init__(self, items=None, rows=None):
        self._items = list(items or [])
        self._rows = rows or []

    def scalar_one_or_none(self):
        if not self._items:
            return None
        return self._items[0]

    def first(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows

    def scalars(self):
        return FakeScalarResult(self._items)


class FakeAsyncSession:
    def __init__(self):
        self.users_by_id: dict[str, User] = {}
        self.users_by_email: dict[str, User] = {}
        self.sessions_by_id: dict[str, UserSession] = {}
        self.bases_by_id: dict[str, UserBase] = {}
        self.bases_by_user_id: dict[str, UserBase] = {}
        self.structures_by_id: dict[str, Structure] = {}
        self.waves_by_id: dict[str, EnemyWave] = {}
        self.enemies_by_id: dict[str, Enemy] = {}

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

        if isinstance(obj, UserBase):
            if not obj.id:
                obj.id = str(uuid.uuid4())
            if obj.hp is None:
                obj.hp = 1000
            if obj.max_hp is None:
                obj.max_hp = 1000
            if obj.shield is None:
                obj.shield = 0
            if obj.created_at is None:
                obj.created_at = now
            self.bases_by_id[obj.id] = obj
            self.bases_by_user_id[obj.user_id] = obj
            return

        if isinstance(obj, Structure):
            if not obj.id:
                obj.id = str(uuid.uuid4())
            if obj.placed_at is None:
                obj.placed_at = now
            if obj.metadata_json is None:
                obj.metadata_json = {}
            self.structures_by_id[obj.id] = obj
            return

        if isinstance(obj, EnemyWave):
            if not obj.id:
                obj.id = str(uuid.uuid4())
            if obj.wave_type is None:
                obj.wave_type = "session"
            if obj.status is None:
                obj.status = "active"
            if obj.seed is None:
                obj.seed = 0
            if obj.started_at is None:
                obj.started_at = now
            self.waves_by_id[obj.id] = obj
            return

        if isinstance(obj, Enemy):
            if not obj.id:
                obj.id = str(uuid.uuid4())
            if obj.attack is None:
                obj.attack = 5
            if obj.speed is None:
                obj.speed = 1.0
            if obj.state is None:
                obj.state = "spawned"
            if obj.spawned_at is None:
                obj.spawned_at = now
            self.enemies_by_id[obj.id] = obj
            return

        raise TypeError(f"Unsupported object type: {type(obj)!r}")

    async def commit(self):
        return None

    async def rollback(self):
        return None

    async def flush(self):
        return None

    async def refresh(self, _obj):
        return None

    def begin(self):
        return _FakeTransaction()

    async def execute(self, statement):
        statement_type = statement.__class__.__name__

        if statement_type == "Select":
            entity = statement.column_descriptions[0]["entity"]
            items = list(self._iter_entity(entity))
            where = statement.whereclause
            if where is not None:
                items = [item for item in items if self._matches(where, item)]
            return FakeResult(items=items)

        if statement_type == "Delete" and statement.table.name == "sessions":
            deleted_ids = []
            to_delete = [
                session_id
                for session_id, session in self.sessions_by_id.items()
                if self._matches(statement.whereclause, session)
            ]
            for session_id in to_delete:
                del self.sessions_by_id[session_id]
                deleted_ids.append((session_id,))
            return FakeResult(rows=deleted_ids)

        if statement_type == "Delete" and statement.table.name == "structures":
            deleted_ids = []
            to_delete = [
                structure_id
                for structure_id, structure in self.structures_by_id.items()
                if self._matches(statement.whereclause, structure)
            ]
            for structure_id in to_delete:
                del self.structures_by_id[structure_id]
                deleted_ids.append((structure_id,))
            return FakeResult(rows=deleted_ids)

        raise AssertionError(f"Unsupported statement: {statement!r}")

    def _iter_entity(self, entity):
        if entity is User:
            return self.users_by_id.values()
        if entity is UserSession:
            return self.sessions_by_id.values()
        if entity is UserBase:
            return self.bases_by_id.values()
        if entity is Structure:
            return self.structures_by_id.values()
        if entity is EnemyWave:
            return self.waves_by_id.values()
        if entity is Enemy:
            return self.enemies_by_id.values()
        raise AssertionError(f"Unsupported entity: {entity!r}")

    def _matches(self, clause, obj):
        clause_type = clause.__class__.__name__
        if clause_type == "BooleanClauseList":
            return all(self._matches(item, obj) for item in clause.clauses)

        if clause_type == "BinaryExpression":
            key = clause.left.key
            current = getattr(obj, key)
            value = getattr(clause.right, "value", None)
            operator_name = clause.operator.__name__

            if operator_name == "eq":
                return current == value
            if operator_name == "le":
                return current <= value
            if operator_name == "in_op":
                return current in value

        raise AssertionError(f"Unsupported clause: {clause!r}")


class _FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


@asynccontextmanager
async def app_client():
    db = FakeAsyncSession()
    test_app = FastAPI()
    test_app.include_router(auth.router)
    test_app.include_router(game.router)
    test_app.include_router(structures.router)

    async def override_get_db():
        yield db

    test_app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            yield client, db
    finally:
        test_app.dependency_overrides.clear()
