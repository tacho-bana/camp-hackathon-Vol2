# Backend

FastAPI + SQLAlchemy (async) + Supabase (PostgreSQL)

## セットアップ

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# .env を編集して DATABASE_URL などを設定

python run.py
```

起動後、http://localhost:8001/docs でSwagger UIを確認できる。

---

## API一覧

### 認証 `/auth`

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/register` | 新規登録。email・password・name を受け取りJWTを返す |
| POST | `/auth/login` | ログイン。email・password を受け取りJWTを返す |
| GET | `/auth/me` | ログイン中ユーザの情報を返す（name・level・xp など） |
| POST | `/auth/logout` | ログアウト（クライアント側でトークンを破棄） |

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
