# フロントエンド

このディレクトリは、React + TypeScript + Vite で構築されたフロントエンドです。

## セットアップ

### 環境変数

`.env` ファイルを作成し、以下を設定してください：

```
VITE_MAPBOX_ACCESS_TOKEN=
VITE_API_BASE_URL=http://localhost:8001
```

## 開発コマンド

```bash
npm install
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します。

## ビルド

```bash
npm run build
```

## 主な構成

- `src/pages/`: 画面単位のコンポーネント
- `src/components/`: 再利用コンポーネント
- `src/state/`: アプリ状態管理
- `src/routing/`: ルーティング
