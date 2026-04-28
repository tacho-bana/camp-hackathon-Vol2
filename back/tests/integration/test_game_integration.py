import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models import Base_ as UserBase
from app.db.models import Enemy, EnemyWave, User


async def _register(client, email="integration@example.com"):
    response = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "password123",
            "name": "integration-user",
        },
    )
    assert response.status_code == 201
    return {"X-CSRF-Token": client.cookies.get("csrf_token")}


@pytest.mark.integration
async def test_base_setup_persists_base(integration_client, db_sessionmaker):
    async with integration_client() as client:
        headers = await _register(client)
        response = await client.post(
            "/game/base",
            json={"lat": 35.681236, "lng": 139.767125, "name": "Tokyo Base"},
            headers=headers,
        )

        assert response.status_code == 200

    async with db_sessionmaker() as session:
        bases = (await session.execute(select(UserBase))).scalars().all()
        assert len(bases) == 1
        assert bases[0].name == "Tokyo Base"


@pytest.mark.integration
async def test_start_requires_base(integration_client):
    async with integration_client() as client:
        headers = await _register(client)
        response = await client.post(
            "/game/start",
            json={"difficulty": 3},
            headers=headers,
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Base is not set"


@pytest.mark.integration
async def test_start_persists_wave_and_enemies(integration_client, db_sessionmaker):
    async with integration_client() as client:
        headers = await _register(client)
        await client.post(
            "/game/base",
            json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
            headers=headers,
        )
        response = await client.post(
            "/game/start",
            json={"difficulty": 2},
            headers=headers,
        )

        assert response.status_code == 201
        assert response.json()["enemy_count"] == 6
        assert "seed" not in response.json()

    async with db_sessionmaker() as session:
        waves = (await session.execute(select(EnemyWave))).scalars().all()
        enemies = (await session.execute(select(Enemy))).scalars().all()
        assert len(waves) == 1
        assert len(enemies) == 6


@pytest.mark.integration
async def test_start_rejects_second_active_wave(integration_client):
    async with integration_client() as client:
        headers = await _register(client)
        await client.post(
            "/game/base",
            json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
            headers=headers,
        )
        first = await client.post("/game/start", json={"difficulty": 2}, headers=headers)
        second = await client.post("/game/start", json={"difficulty": 4}, headers=headers)

        assert first.status_code == 201
        assert second.status_code == 409
        assert second.json()["detail"] == "An active wave already exists"


@pytest.mark.integration
async def test_db_constraint_blocks_two_active_waves_for_one_user(db_sessionmaker):
    async with db_sessionmaker() as session:
        user = User(email="db@example.com", password_hash="hashed", name="db-user")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        first_wave = EnemyWave(
            user_id=user.id,
            wave_type="session",
            difficulty=1,
            status="active",
            seed=123,
        )
        second_wave = EnemyWave(
            user_id=user.id,
            wave_type="session",
            difficulty=2,
            status="active",
            seed=456,
        )
        session.add(first_wave)
        await session.commit()

        session.add(second_wave)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            return

        raise AssertionError("Expected IntegrityError for duplicate active wave")
