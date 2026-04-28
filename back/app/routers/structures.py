import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_db
from app.db.models import Base_ as UserBase
from app.db.models import Structure, User
from app.schemas.structure import PlaceStructureRequest, StructureResponse
from app.security import get_current_user, validate_csrf

router = APIRouter(prefix="/structures", tags=["structures"])

STRUCTURE_DEFAULTS = {
    "turret": {
        "name": "Turret",
        "hp": 120,
        "max_hp": 120,
        "attack": 18,
        "range_m": 120,
        "duration_sec": 86400,
        "rarity": "common",
        "metadata_json": {"effect": "damage"},
    },
    "wall": {
        "name": "Wall",
        "hp": 320,
        "max_hp": 320,
        "attack": 0,
        "range_m": 20,
        "duration_sec": 86400,
        "rarity": "common",
        "metadata_json": {"effect": "block"},
    },
    "slow": {
        "name": "Slow Trap",
        "hp": 90,
        "max_hp": 90,
        "attack": 4,
        "range_m": 90,
        "duration_sec": 86400,
        "rarity": "common",
        "metadata_json": {"effect": "slow"},
    },
}


async def _get_user_base(db: AsyncSession, user_id: str) -> UserBase | None:
    result = await db.execute(select(UserBase).where(UserBase.user_id == user_id))
    return result.scalar_one_or_none()


@router.post(
    "/",
    response_model=StructureResponse,
    status_code=status.HTTP_201_CREATED,
)
async def place_structure(
    payload: PlaceStructureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(validate_csrf),
) -> StructureResponse:
    base = await _get_user_base(db, current_user.id)
    if base is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Base is not set",
        )

    defaults = STRUCTURE_DEFAULTS[payload.type]
    structure = Structure(
        user_id=current_user.id,
        base_id=base.id,
        type=payload.type,
        lat=payload.lat,
        lng=payload.lng,
        **defaults,
    )
    db.add(structure)
    await db.commit()
    await db.refresh(structure)
    return StructureResponse.model_validate(structure)


@router.get("/", response_model=list[StructureResponse])
async def list_structures(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StructureResponse]:
    result = await db.execute(select(Structure).where(Structure.user_id == current_user.id))
    structures = sorted(
        result.scalars().all(),
        key=lambda structure: structure.placed_at,
        reverse=True,
    )
    return [StructureResponse.model_validate(structure) for structure in structures]


@router.delete("/{structure_id}")
async def delete_structure(
    structure_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(validate_csrf),
) -> dict[str, str]:
    try:
        normalized_structure_id = str(uuid.UUID(structure_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Structure not found",
        ) from None

    result = await db.execute(
        select(Structure).where(
            Structure.id == normalized_structure_id,
            Structure.user_id == current_user.id,
        )
    )
    structure = result.scalar_one_or_none()
    if structure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Structure not found",
        )

    await db.execute(
        delete(Structure).where(
            Structure.id == normalized_structure_id,
            Structure.user_id == current_user.id,
        )
    )
    await db.commit()
    return {"message": "Structure deleted successfully"}
