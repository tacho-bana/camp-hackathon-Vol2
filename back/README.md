# Backend

FastAPI + SQLAlchemy (async) + Supabase (PostgreSQL)

## セットアップ

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# .env を編集して DATABASE_URL などを設定

# DBにテーブルを作成
# Supabase SQL editor などで db/init.sql を実行

python run.py
```

起動後、http://localhost:8001/docs でSwagger UIを確認できる。

## 認証方式

- 認証は `HttpOnly cookie + server-side session` 方式
- cookie の値は JWT ではなくランダムな `session_id`
- セッション本体は `sessions` テーブルに保存
- CSRF 対策として `csrf_token` cookie も発行し、状態変更系リクエストでは `X-CSRF-Token` ヘッダー検証を行う
- `logout` 時は cookie を削除し、DB 上の session も削除する
- 期限切れ session は API 起動中に定期削除される

フロントから認証付きで叩く場合は `fetch` / `axios` 側で cookie を送る必要がある。

```ts
fetch("http://localhost:8001/auth/me", {
  credentials: "include",
})
```

状態変更系リクエストでは CSRF token を header に付ける。

```ts
fetch("http://localhost:8001/auth/logout", {
  method: "POST",
  credentials: "include",
  headers: {
    "X-CSRF-Token": csrfToken,
  },
})
```

別オリジン構成で運用する場合は、cookie 設定と CORS 設定を合わせること。

- 同一サイト寄りの構成: `AUTH_COOKIE_SAMESITE=lax`
- 完全な別ドメイン構成: `AUTH_COOKIE_SAMESITE=none` と `AUTH_COOKIE_SECURE=true`

---

## API一覧

### 認証 `/auth`

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/register` | 新規登録。email・password・name を受け取り、session cookie を発行する |
| POST | `/auth/login` | ログイン。email・password を受け取り、session cookie を発行する |
| GET | `/auth/me` | ログイン中ユーザの情報を返す（name・level・xp など） |
| POST | `/auth/logout` | ログアウト。session cookie を削除し、DB 上の session も削除する |

### ゲーム `/game`

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/game/base` | 拠点を設定する。現在地の緯度経度を登録 |
| POST | `/game/start` | ゲーム開始。難易度を受け取り、ウェーブと敵を生成する |
| POST | `/game/clear` | クリア。報酬（XP・アイテムなど）を付与する |
| POST | `/game/end` | 強制終了。報酬なしでゲームを終了する |

### 防衛施設 `/structures`

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/structures/` | 現在地に防衛施設を配置。種類（turret・wall・slow）と緯度経度を受け取る |
| GET | `/structures/` | 配置済み施設の一覧を返す |
| DELETE | `/structures/{id}` | 指定した施設を撤去する |

施設の種類：
- `turret` : 範囲内の敵を攻撃する
- `wall` : 道に設置して敵を足止めする
- `slow` : 周囲の敵の進行を遅くする

### 敵 `/enemies`

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/enemies/` | 現在アクティブな敵の一覧を返す（地図表示用） |
| GET | `/enemies/wave/{id}` | ウェーブ情報・敵一覧・進行ルートを返す |

---

## テーブル構成

`back/db/init.sql` を参照。

- `users`
- `sessions`
- `bases`
- `structures`
- `enemy_waves`
- `enemies`
- `movement_logs`
- `action_logs`
- `battle_logs`

## 動作確認

cookie を保存しながら確認する。

### register

```bash
curl -i -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123","name":"test-user"}'
```

### login

```bash
curl -i -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'
```

### me

```bash
curl -i http://localhost:8001/auth/me \
  -b cookies.txt
```

### logout

まず cookie jar から `csrf_token` を取り出す。

```bash
csrf_token=$(awk '$6 == "csrf_token" {print $7}' cookies.txt)
```

そのうえで header を付けて logout する。

```bash
curl -i -X POST http://localhost:8001/auth/logout \
  -b cookies.txt \
  -c cookies.txt \
  -H "X-CSRF-Token: ${csrf_token}"
```

## Integration Test

ローカル PostgreSQL を Docker で立てて、実DB integration test を回せる。

```bash
docker run --name camp-postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=camp_test \
  -p 5433:5432 \
  -d postgres:16
```

`TEST_DATABASE_URL` を設定する。`.env.test.example` を参考にする。

```bash
export TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/camp_test
pytest -q tests/integration -m integration
```
