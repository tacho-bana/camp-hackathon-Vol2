# TASKS

## 現状まとめ

実装済み（モック状態）:

- プロジェクト構成 (Vite + React + TS)
- ルーティング (`AppRouter`, `AppShell`)
- `AppStateContext` (モックデータで動作)
- `MapView` (Mapbox 表示、モック座標)
- `MapPage` (モック POI、モックゲームフロー)
- 各ページのシェル (`Battle`, `Base`, `Inventory`, `Report`, `Login`)

---

## フェーズ 1: 環境整備・型定義

- [x] `.env.local` に `VITE_MAPBOX_ACCESS_TOKEN` を設定する（手動）
- [x] `VITE_API_BASE_URL` を `.env.local` に追加する（手動）
- [x] `types/game.ts` に `LatLng` 型を追加する (`{ lat: number; lng: number }`)
- [x] `types/game.ts` に `GamePhase` 型を追加する (`"waiting" | "prep" | "battle" | "result"`)
- [x] `types/game.ts` に `Enemy` 型を追加する (`id, lat, lng, hp, maxHp, speed`)
- [x] `types/game.ts` に `Structure` 型を追加する (`id, lat, lng, kind, hp, maxHp`)
- [x] `types/game.ts` に `GameState` 型を追加する (全ゲーム状態を集約)
- [x] `NearbyPlace` 型に `lat`, `lng` フィールドを追加する

## フェーズ 2: ゲーム状態管理の刷新

- [x] `AppStateContext` に `gamePhase: GamePhase` を追加する（初期値: `"waiting"`）
- [x] `AppStateContext` に `bitcoin: number` を追加する（初期値: 300）
- [x] `AppStateContext` に `homeCoords: LatLng | null` を追加する
- [x] `AppStateContext` に `homeHp: number` を追加する（初期値: 100）
- [x] `AppStateContext` に `structures: Structure[]` を追加する
- [x] `AppStateContext` に `enemies: Enemy[]` を追加する
- [x] `AppStateContext` に `setGamePhase`, `addBitcoin`, `spendBitcoin`, `setHomeCoords`, `setHomeHp`, `setStructures`, `setEnemies` アクションを追加する

## フェーズ 3: 位置情報・位置偽装モード

- [x] `hooks/useGeolocation.ts` を作成する（`navigator.geolocation.watchPosition` ラッパー）
- [x] `MapPage` に `useGeolocation` を組み込み、現在地を管理する
- [x] `MapView` に現在地マーカー（青い点）を追加する
- [x] 開発用の位置偽装モードを実装する（地図クリックで現在地座標をセット）
- [x] 位置偽装モードのトグルボタンを `MapPage` に追加する

## フェーズ 4: 距離計算・POI 取得

- [ ] `utils/geo.ts` を作成する（Haversine 公式で距離計算する `calcDistance(a: LatLng, b: LatLng): number`）
- [ ] `hooks/useNearbyPOI.ts` を作成する（Mapbox Search API で現在地周辺の POI を取得）
- [ ] `MapView` の `nearbyPlaces` マーカーを実際の緯度経度でプロット（モック座標から移行）
- [ ] 現在地から各 POI までの距離を `calcDistance` で計算して `NearbyPlace.distance` に反映する
- [ ] `MapPage` のダミー `nearbyPlaces` 配列を `useNearbyPOI` の結果に差し替える

## フェーズ 5: バックエンド API クライアント

- [ ] `api/client.ts` を作成する（`VITE_API_BASE_URL` を使う fetch ラッパー）
- [ ] `api/game.ts` に `postGameBase(lat: number, lng: number)` を作成する
- [ ] `api/game.ts` に `postGameStart(difficulty: string)` を作成する
- [ ] `api/game.ts` に `postGameClear()` を作成する
- [ ] `api/game.ts` に `postGameEnd()` を作成する
- [ ] `api/structures.ts` に `postStructure(kind: string, lat: number, lng: number)` を作成する
- [ ] `api/structures.ts` に `getStructures()` を作成する
- [ ] `api/enemies.ts` に `getEnemies()` を作成する
- [ ] `api/enemies.ts` に `getWave(id: string)` を作成する

## フェーズ 6: 準備フェーズ実装

- [ ] ゲーム開始ボタンのハンドラを `postGameBase` 呼び出しに置き換える
- [ ] 成功後に `gamePhase` を `"prep"` に、現在地を `homeCoords` にセットする
- [ ] `hooks/useCountdown.ts` を作成する（秒単位のカウントダウン、汎用）
- [ ] 準備フェーズのカウントダウン（15分）を `MapPage` に表示する
- [ ] 選択中 POI が 50m 以内かつ未チェックインのとき「チェックイン」ボタンを有効化する
- [ ] チェックイン処理を `addBitcoin(30)` と连動させる（1店1回制限）
- [ ] 選択中 POI が 50m 以内かつチェックイン済みのとき「防衛拠点設置」ボタンを有効化する
- [ ] 拠点設置処理を `postStructure` 呼び出し → `spendBitcoin(150)` と連動させる（残高不足時は無効）
- [ ] 配置済み拠点を `MapView` に緯度経度で表示する

## フェーズ 7: バトルフェーズ実装

- [ ] ゲームスタートボタンのハンドラを `postGameStart` 呼び出しに置き換える
- [ ] 成功後に `gamePhase` を `"battle"` にセットする
- [ ] バトルフェーズのカウントダウン（5分）を `MapPage` に表示する
- [ ] `hooks/useEnemyPolling.ts` を作成する（3秒おきに `getEnemies` をポーリング）
- [ ] 取得した敵データを `setEnemies` でストアに反映する
- [ ] `EnemyLayer` に実際の緯度経度を渡して地図上にプロットする
- [ ] 家HP が 0 になったら `postGameEnd` を呼び `gamePhase` を `"result"` に移行する
- [ ] 全敵が倒れたら `postGameClear` を呼び `gamePhase` を `"result"` に移行する
- [ ] 家HP・各拠点HP を `MapPage` の HUD に表示する

## フェーズ 8: 結果画面

- [ ] `ReportPage` に `gamePhase === "result"` 時の勝ち/負け表示を実装する
- [ ] `ReportPage` に「もう一度遊ぶ」ボタンを追加する（状態リセット → `/map` に遷移）
- [ ] `AppStateContext` に `resetGame()` アクションを追加する（フェーズ・敵・拠点・HP をリセット）
