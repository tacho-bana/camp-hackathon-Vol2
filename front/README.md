# フロントエンド

このディレクトリは、React + TypeScript + Vite で構築されたフロントエンドです。

## セットアップ

### 環境変数

`.env` ファイルを作成し、以下を設定してください：

```
VITE_MAPBOX_ACCESS_TOKEN=
VITE_API_BASE_URL=http://localhost:8001
```

ローカルでは `VITE_API_BASE_URL` を backend の URL に向けます。
Vercel 本番では `/api` rewrite を使う想定です。`vercel.json.example` を
`vercel.json` にコピーして、Render の backend URL を設定してください。

## 開発コマンド

```bash
npm install
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します。

## 本番メモ

- フロントは Vercel、バックは Render を想定
- browser からは `/api/...` へアクセスし、Vercel rewrite で Render に proxy する
- backend の cookie 認証を使うため、frontend 側の `fetch` は
  `credentials: "include"` 前提

## ビルド

```bash
npm run build
```

## 主な構成

- `src/pages/`: 画面単位のコンポーネント
- `src/components/`: 再利用コンポーネント
- `src/state/`: アプリ状態管理
- `src/routing/`: ルーティング
