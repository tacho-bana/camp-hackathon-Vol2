import asyncio

from tests.fakes import app_client


async def _register_and_get_headers(client, email="structure@example.com"):
    response = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "password123",
            "name": "builder",
        },
    )
    assert response.status_code == 201
    return {"X-CSRF-Token": client.cookies.get("csrf_token")}


def test_place_structure_requires_base():
    async def run():
        async with app_client() as (client, _db):
            headers = await _register_and_get_headers(client)
            response = await client.post(
                "/structures/",
                json={"type": "turret", "lat": 35.0, "lng": 139.0},
                headers=headers,
            )

            assert response.status_code == 400
            assert response.json()["detail"] == "Base is not set"

    asyncio.run(run())


def test_place_and_list_structures_for_current_user():
    async def run():
        async with app_client() as (client, db):
            headers = await _register_and_get_headers(client)
            await client.post(
                "/game/base",
                json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
                headers=headers,
            )

            first = await client.post(
                "/structures/",
                json={"type": "turret", "lat": 35.001, "lng": 139.001},
                headers=headers,
            )
            second = await client.post(
                "/structures/",
                json={"type": "slow", "lat": 35.002, "lng": 139.002},
                headers=headers,
            )
            listed = await client.get("/structures/")

            assert first.status_code == 201
            assert second.status_code == 201
            assert listed.status_code == 200
            body = listed.json()
            assert len(body) == 2
            assert {item["type"] for item in body} == {"turret", "slow"}
            assert len(db.structures_by_id) == 2
            assert body[0]["placed_at"] >= body[1]["placed_at"]

    asyncio.run(run())


def test_place_structure_rejects_invalid_type():
    async def run():
        async with app_client() as (client, _db):
            headers = await _register_and_get_headers(client)
            await client.post(
                "/game/base",
                json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
                headers=headers,
            )
            response = await client.post(
                "/structures/",
                json={"type": "laser", "lat": 35.001, "lng": 139.001},
                headers=headers,
            )

            assert response.status_code == 422

    asyncio.run(run())


def test_delete_structure_only_allows_owner():
    async def run():
        async with app_client() as (client, db):
            owner_headers = await _register_and_get_headers(client)
            await client.post(
                "/game/base",
                json={"lat": 35.0, "lng": 139.0, "name": "Owner Base"},
                headers=owner_headers,
            )
            created = await client.post(
                "/structures/",
                json={"type": "wall", "lat": 35.003, "lng": 139.003},
                headers=owner_headers,
            )
            structure_id = created.json()["id"]

            other = await client.post(
                "/auth/register",
                json={
                    "email": "other@example.com",
                    "password": "password123",
                    "name": "other",
                },
            )
            assert other.status_code == 201
            other_headers = {"X-CSRF-Token": client.cookies.get("csrf_token")}
            await client.post(
                "/game/base",
                json={"lat": 36.0, "lng": 140.0, "name": "Other Base"},
                headers=other_headers,
            )

            forbidden = await client.delete(
                f"/structures/{structure_id}",
                headers=other_headers,
            )

            assert forbidden.status_code == 404
            assert len(db.structures_by_id) == 1

    asyncio.run(run())


def test_delete_structure_removes_owned_structure_and_404s_for_missing():
    async def run():
        async with app_client() as (client, db):
            headers = await _register_and_get_headers(client)
            await client.post(
                "/game/base",
                json={"lat": 35.0, "lng": 139.0, "name": "Base A"},
                headers=headers,
            )
            created = await client.post(
                "/structures/",
                json={"type": "wall", "lat": 35.003, "lng": 139.003},
                headers=headers,
            )
            structure_id = created.json()["id"]

            deleted = await client.delete(f"/structures/{structure_id}", headers=headers)
            missing = await client.delete("/structures/missing-id", headers=headers)

            assert deleted.status_code == 200
            assert deleted.json()["message"] == "Structure deleted successfully"
            assert missing.status_code == 404
            assert missing.json()["detail"] == "Structure not found"
            assert len(db.structures_by_id) == 0

    asyncio.run(run())
