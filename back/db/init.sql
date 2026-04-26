-- ゲームバックエンド テーブル定義

-- ユーザ
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name        TEXT,
    level       INTEGER NOT NULL DEFAULT 1,
    xp          INTEGER NOT NULL DEFAULT 0,
    energy      INTEGER NOT NULL DEFAULT 100,
    home_lat    DOUBLE PRECISION,
    home_lng    DOUBLE PRECISION,
    last_active_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 拠点
CREATE TABLE IF NOT EXISTS bases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Home Base',
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    hp          INTEGER NOT NULL DEFAULT 1000,
    max_hp      INTEGER NOT NULL DEFAULT 1000,
    shield      INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 防衛施設（turret: 攻撃 / wall: 足止め / slow: 減速）
CREATE TABLE IF NOT EXISTS structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_id         UUID NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    name            TEXT NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    hp              INTEGER NOT NULL,
    max_hp          INTEGER NOT NULL,
    attack          INTEGER NOT NULL DEFAULT 10,
    range_m         INTEGER NOT NULL DEFAULT 100,
    duration_sec    INTEGER NOT NULL DEFAULT 86400,
    placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    source_place_id TEXT,
    rarity          TEXT NOT NULL DEFAULT 'common',
    metadata_json   JSONB NOT NULL DEFAULT '{}'
);

-- 敵ウェーブ
CREATE TABLE IF NOT EXISTS enemy_waves (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wave_type       TEXT NOT NULL DEFAULT 'daily',
    difficulty      INTEGER NOT NULL DEFAULT 1,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at         TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'pending',
    boss_enemy_id   UUID,
    seed            INTEGER NOT NULL DEFAULT 0
);

-- 敵
CREATE TABLE IF NOT EXISTS enemies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wave_id         UUID REFERENCES enemy_waves(id) ON DELETE CASCADE,
    enemy_type      TEXT NOT NULL,
    name            TEXT NOT NULL,
    hp              INTEGER NOT NULL,
    max_hp          INTEGER NOT NULL,
    attack          INTEGER NOT NULL DEFAULT 5,
    speed           DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    state           TEXT NOT NULL DEFAULT 'spawned',
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    target_base_id  UUID REFERENCES bases(id),
    spawned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    despawn_at      TIMESTAMPTZ,
    metadata_json   JSONB NOT NULL DEFAULT '{}'
);

-- 移動ログ
CREATE TABLE IF NOT EXISTS movement_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    accuracy_m  DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source      TEXT NOT NULL DEFAULT 'gps',
    speed_mps   DOUBLE PRECISION
);

-- アクションログ
CREATE TABLE IF NOT EXISTS action_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id   TEXT,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- バトルログ
CREATE TABLE IF NOT EXISTS battle_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wave_id     UUID REFERENCES enemy_waves(id),
    tick_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type  TEXT NOT NULL,
    actor_type  TEXT NOT NULL,
    actor_id    UUID NOT NULL,
    target_type TEXT NOT NULL,
    target_id   UUID NOT NULL,
    value       INTEGER NOT NULL DEFAULT 0,
    metadata_json JSONB NOT NULL DEFAULT '{}'
);
