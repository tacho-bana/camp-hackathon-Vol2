"""
SQLAlchemy ORM モデル定義
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    BigInteger, DateTime, Double, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    level: Mapped[int] = mapped_column(Integer, default=1)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    energy: Mapped[int] = mapped_column(Integer, default=100)
    home_lat: Mapped[float | None] = mapped_column(Double)
    home_lng: Mapped[float | None] = mapped_column(Double)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Base_(Base):
    """本拠地。Base という名前は Python 標準と被るため Base_ とする。"""
    __tablename__ = "bases"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    name: Mapped[str] = mapped_column(Text, default="Home Base")
    lat: Mapped[float] = mapped_column(Double)
    lng: Mapped[float] = mapped_column(Double)
    hp: Mapped[int] = mapped_column(Integer, default=1000)
    max_hp: Mapped[int] = mapped_column(Integer, default=1000)
    shield: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Structure(Base):
    __tablename__ = "structures"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE")
    )
    base_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("bases.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Double)
    lng: Mapped[float] = mapped_column(Double)
    hp: Mapped[int] = mapped_column(Integer)
    max_hp: Mapped[int] = mapped_column(Integer)
    attack: Mapped[int] = mapped_column(Integer, default=10)
    range_m: Mapped[int] = mapped_column(Integer, default=100)
    duration_sec: Mapped[int] = mapped_column(Integer, default=86400)
    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_place_id: Mapped[str | None] = mapped_column(Text)
    rarity: Mapped[str] = mapped_column(Text, default="common")
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)


class EnemyWave(Base):
    __tablename__ = "enemy_waves"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE")
    )
    wave_type: Mapped[str] = mapped_column(Text, default="daily")
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text, default="pending")
    boss_enemy_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    seed: Mapped[int] = mapped_column(Integer, default=0)


class Enemy(Base):
    __tablename__ = "enemies"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE")
    )
    wave_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("enemy_waves.id", ondelete="CASCADE")
    )
    enemy_type: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    hp: Mapped[int] = mapped_column(Integer)
    max_hp: Mapped[int] = mapped_column(Integer)
    attack: Mapped[int] = mapped_column(Integer, default=5)
    speed: Mapped[float] = mapped_column(Double, default=1.0)
    state: Mapped[str] = mapped_column(Text, default="spawned")
    lat: Mapped[float] = mapped_column(Double)
    lng: Mapped[float] = mapped_column(Double)
    target_base_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("bases.id")
    )
    spawned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    despawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)


class MovementLog(Base):
    __tablename__ = "movement_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE")
    )
    lat: Mapped[float] = mapped_column(Double)
    lng: Mapped[float] = mapped_column(Double)
    accuracy_m: Mapped[float] = mapped_column(Double, default=50.0)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    source: Mapped[str] = mapped_column(Text, default="gps")
    speed_mps: Mapped[float | None] = mapped_column(Double)


class ActionLog(Base):
    __tablename__ = "action_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE")
    )
    action_type: Mapped[str] = mapped_column(Text)
    target_type: Mapped[str | None] = mapped_column(Text)
    target_id: Mapped[str | None] = mapped_column(Text)
    payload_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BattleLog(Base):
    __tablename__ = "battle_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE")
    )
    wave_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("enemy_waves.id")
    )
    tick_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    event_type: Mapped[str] = mapped_column(Text)
    actor_type: Mapped[str] = mapped_column(Text)
    actor_id: Mapped[str] = mapped_column(UUID(as_uuid=False))
    target_type: Mapped[str] = mapped_column(Text)
    target_id: Mapped[str] = mapped_column(UUID(as_uuid=False))
    value: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
