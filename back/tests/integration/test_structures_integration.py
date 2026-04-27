import pytest
from sqlalchemy import select

from app.db.models import Structure


async def _register(client, email="structures-integration@example.com"):
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


async def _setup_base(client, headers, lat=35.0, lng=139.0, name="Base A"):
    response = await client.post(
        "/game/base",
        json={"lat": lat, "lng": lng, "name": name},
        headers=headers,
    )
    assert response.status_code == 200


@pytest.mark.integration
async def test_place_structure_requires_base(integration_client):
    async with integration_client() as client:
        headers = await _register(client)
        response = await client.post(
            "/structures/",
            json={"type": "turret", "lat": 35.0, "lng": 139.0},
            headers=headers,
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Base is not set"


@pytest.mark.integration
async def test_place_and_list_structures(integration_client, db_sessionmaker):
    async with integration_client() as client:
        headers = await _register(client)
        await _setup_base(client, headers)

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
        assert len(listed.json()) == 2
        assert {item["type"] for item in listed.json()} == {"turret", "slow"}

    async with db_sessionmaker() as session:
        structures = (await session.execute(select(Structure))).scalars().all()
        assert len(structures) == 2


@pytest.mark.integration
async def test_invalid_structure_type_returns_422(integration_client):
    async with integration_client() as client:
        headers = await _register(client)
        await _setup_base(client, headers)
        response = await client.post(
            "/structures/",
            json={"type": "laser", "lat": 35.001, "lng": 139.001},
            headers=headers,
        )

        assert response.status_code == 422


@pytest.mark.integration
async def test_delete_structure_only_allows_owner(integration_client, db_sessionmaker):
    async with integration_client() as client:
        owner_headers = await _register(client)
        await _setup_base(client, owner_headers)
        created = await client.post(
            "/structures/",
            json={"type": "wall", "lat": 35.003, "lng": 139.003},
            headers=owner_headers,
        )
        structure_id = created.json()["id"]

        other_headers = await _register(client, email="other-structures@example.com")
        await _setup_base(client, other_headers, lat=36.0, lng=140.0, name="Other Base")
        forbidden = await client.delete(
            f"/structures/{structure_id}",
            headers=other_headers,
        )

        assert forbidden.status_code == 404

    async with db_sessionmaker() as session:
        structures = (await session.execute(select(Structure))).scalars().all()
        assert len(structures) == 1


@pytest.mark.integration
async def test_delete_structure_removes_owned_structure(integration_client, db_sessionmaker):
    async with integration_client() as client:
        headers = await _register(client)
        await _setup_base(client, headers)
        created = await client.post(
            "/structures/",
            json={"type": "wall", "lat": 35.003, "lng": 139.003},
            headers=headers,
        )
        structure_id = created.json()["id"]

        deleted = await client.delete(f"/structures/{structure_id}", headers=headers)
        missing = await client.delete("/structures/missing-id", headers=headers)

        assert deleted.status_code == 200
        assert missing.status_code == 404

    async with db_sessionmaker() as session:
        structures = (await session.execute(select(Structure))).scalars().all()
        assert len(structures) == 0
