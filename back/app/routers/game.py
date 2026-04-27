import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.db.engine import get_db
from app.db.models import Base_ as UserBase
from app.db.models import Enemy, EnemyWave, User
from app.schemas.game import (
    BaseResponse,
    BaseSetupRequest,
    GameStateResponse,
    StageSelectRequest,
)
from app.security import get_current_user, validate_csrf

router = APIRouter(prefix="/game", tags=["game"])


def _generate_enemy_specs(base: UserBase, difficulty: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    enemy_count = difficulty * 3
    enemies = []
    for index in range(enemy_count):
        lat_offset = rng.uniform(-0.003, 0.003)
        lng_offset = rng.uniform(-0.003, 0.003)
        enemies.append(
            {
                "enemy_type": "virus",
                "name": f"Virus {index + 1}",
                "hp": 20 + difficulty * 10,
                "max_hp": 20 + difficulty * 10,
                "attack": 4 + difficulty,
                "speed": 0.8 + (difficulty * 0.1),
                "state": "spawned",
                "lat": base.lat + lat_offset,
                "lng": base.lng + lng_offset,
            }
        )
    return enemies


@router.post("/base", response_model=BaseResponse)
async def setup_base(
    payload: BaseSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(validate_csrf),
) -> BaseResponse:
    result = await db.execute(select(UserBase).where(UserBase.user_id == current_user.id))
    base = result.scalar_one_or_none()

    if base is None:
        base = UserBase(
            user_id=current_user.id,
            name=payload.name or "Home Base",
            lat=payload.lat,
            lng=payload.lng,
        )
        db.add(base)
    else:
        base.name = payload.name or base.name
        base.lat = payload.lat
        base.lng = payload.lng

    current_user.home_lat = payload.lat
    current_user.home_lng = payload.lng

    await db.commit()
    await db.refresh(base)
    return BaseResponse.model_validate(base)


@router.post(
    "/start",
    response_model=GameStateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_game(
    payload: StageSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(validate_csrf),
) -> GameStateResponse:
    base_result = await db.execute(select(UserBase).where(UserBase.user_id == current_user.id))
    base = base_result.scalar_one_or_none()
    if base is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Base is not set",
        )

    waves_result = await db.execute(
        select(EnemyWave).where(EnemyWave.user_id == current_user.id)
    )
    existing_wave = next(
        (
            wave
            for wave in waves_result.scalars().all()
            if wave.status in {"pending", "active"}
        ),
        None,
    )
    if existing_wave is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active wave already exists",
        )

    seed = random.randint(1, 10**9)
    started_at = datetime.now(UTC)
    enemy_specs = _generate_enemy_specs(base, payload.difficulty, seed)

    wave = EnemyWave(
        user_id=current_user.id,
        wave_type="session",
        difficulty=payload.difficulty,
        started_at=started_at,
        status="active",
        seed=seed,
    )

    try:
        async with db.begin():
            db.add(wave)
            await db.flush()

            for spec in enemy_specs:
                enemy = Enemy(
                    user_id=current_user.id,
                    wave_id=wave.id,
                    target_base_id=base.id,
                    **spec,
                )
                db.add(enemy)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active wave already exists",
        ) from exc

    return GameStateResponse(
        wave_id=wave.id,
        status=wave.status,
        difficulty=wave.difficulty,
        started_at=wave.started_at,
        enemy_count=len(enemy_specs),
    )
