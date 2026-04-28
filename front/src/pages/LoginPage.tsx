import { useState } from "react";
import { navigateTo } from "../routing/navigation";
import { useAppState } from "../state/AppStateContext";

export function LoginPage() {
  const { signIn } = useAppState();
  const [email, setEmail] = useState("riku@example.com");
  const [password, setPassword] = useState("password");
  const [displayName, setDisplayName] = useState("リク");

  const handleSignIn = () => {
    signIn();
    navigateTo("/map");
  };

  return (
    <section className="auth-screen auth-layout">
      <div className="hero-panel auth-panel">
        <p className="eyebrow">サインイン</p>
        <h1>ネイバーセキュリティ</h1>
        <p className="lead">
          実際の移動を施設展開に変換し、夜間のオート防衛で自宅エリアを
          守り抜きます。まずはログインか新規登録から始めてください。
        </p>

        <div className="auth-grid">
          <label className="auth-field">
            <span>ユーザ名</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="リク"
            />
          </label>

          <label className="auth-field">
            <span>メールアドレス</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="riku@example.com"
            />
          </label>

          <label className="auth-field">
            <span>パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="password"
            />
          </label>
        </div>

        <div className="auth-actions">
          <button
            type="button"
            className="primary-button floating-action"
            onClick={handleSignIn}
          >
            新規登録 / ログイン
          </button>
        </div>

        <p className="muted auth-note">
          いまはフロントモックです。入力値はUI確認用で、ボタンを押すと
          ゲーム画面へ進みます。
        </p>
      </div>
    </section>
  );
}
