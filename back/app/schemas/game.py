from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BaseSetupRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    name: str | None = Field(default=None, max_length=100)


class BaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    lat: float
    lng: float
    hp: int
    max_hp: int
    shield: int


class StageSelectRequest(BaseModel):
    difficulty: int = Field(ge=1, le=5)


class GameStateResponse(BaseModel):
    wave_id: str
    status: str
    difficulty: int
    started_at: datetime
    enemy_count: int
