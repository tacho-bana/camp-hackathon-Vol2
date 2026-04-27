from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

StructureType = Literal["turret", "wall", "slow"]


class PlaceStructureRequest(BaseModel):
    type: StructureType
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class StructureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: StructureType
    name: str
    lat: float
    lng: float
    hp: int
    max_hp: int
    attack: int
    range_m: int
    duration_sec: int
    placed_at: datetime
    rarity: str
    metadata_json: dict
