import asyncio

from tests.fakes import app_client


def test_base_setup_creates_base_and_updates_user_home():
    async def run():
        async with app_client() as (client, db):
            headers = await client.post(
                "/auth/register",
                json={
                    "email": "game@example.com",
                    "password": "password123",
                    "name": "gamer",
                },
            )
            assert headers.status_code == 201
            csrf_headers = {"X-CSRF-Token": client.cookies.get("csrf_token")}

            response = await client.post(
                "/game/base",
                json={
                    "lat": 35.681236,
                    "lng": 139.767125,
                    "name": "Tokyo Base",
                },
                headers=csrf_headers,
            )

            assert response.status_code == 200
            assert response.json()["name"] == "Tokyo Base"
            assert len(db.bases_by_id) == 1
            user = next(iter(db.users_by_id.values()))
            assert user.home_lat == 35.681236
            assert user.home_lng == 139.767125

    asyncio.run(run())


def test_base_setup_updates_existing_base():
    async def run():
        async with app_client() as (client, db):
            response = await client.post(
                "/auth/register",
                json={
                    "email": "game@example.com",
                    "password": "password123",
                    "name": "gamer",
                },
            )
            assert response.status_code == 201
            headers = {"X-CSRF-Token": client.cookies.get("csrf_token")}

            first = await client.post(
                "/game/base",
                json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
                headers=headers,
            )
            second = await client.post(
                "/game/base",
                json={"lat": 36.0, "lng": 140.0, "name": "Base B"},
                headers=headers,
            )

            assert first.status_code == 200
            assert second.status_code == 200
            assert len(db.bases_by_id) == 1
            base = next(iter(db.bases_by_id.values()))
            assert base.name == "Base B"
            assert base.lat == 36.0
            assert base.lng == 140.0

    asyncio.run(run())


def test_game_start_requires_base():
    async def run():
        async with app_client() as (client, _db):
            response = await client.post(
                "/auth/register",
                json={
                    "email": "game@example.com",
                    "password": "password123",
                    "name": "gamer",
                },
            )
            assert response.status_code == 201
            headers = {"X-CSRF-Token": client.cookies.get("csrf_token")}

            response = await client.post(
                "/game/start",
                json={"difficulty": 3},
                headers=headers,
            )

            assert response.status_code == 400
            assert response.json()["detail"] == "Base is not set"

    asyncio.run(run())


def test_game_start_creates_single_wave_and_initial_enemies():
    async def run():
        async with app_client() as (client, db):
            response = await client.post(
                "/auth/register",
                json={
                    "email": "game@example.com",
                    "password": "password123",
                    "name": "gamer",
                },
            )
            assert response.status_code == 201
            headers = {"X-CSRF-Token": client.cookies.get("csrf_token")}
            await client.post(
                "/game/base",
                json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
                headers=headers,
            )

            response = await client.post(
                "/game/start",
                json={"difficulty": 3},
                headers=headers,
            )

            assert response.status_code == 201
            body = response.json()
            assert body["difficulty"] == 3
            assert body["status"] == "active"
            assert body["enemy_count"] == 9
            assert "seed" not in body
            assert len(db.waves_by_id) == 1
            assert len(db.enemies_by_id) == 9
            wave = next(iter(db.waves_by_id.values()))
            assert wave.wave_type == "session"

    asyncio.run(run())


def test_game_start_rejects_when_active_wave_exists():
    async def run():
        async with app_client() as (client, db):
            response = await client.post(
                "/auth/register",
                json={
                    "email": "game@example.com",
                    "password": "password123",
                    "name": "gamer",
                },
            )
            assert response.status_code == 201
            headers = {"X-CSRF-Token": client.cookies.get("csrf_token")}
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
            assert len(db.waves_by_id) == 1

    asyncio.run(run())
