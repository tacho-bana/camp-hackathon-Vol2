import { useState } from "react";
import { navigateTo } from "../routing/navigation";
import { useAppState } from "../state/AppStateContext";

export function LoginPage() {
  const { signIn } = useAppState();
  const [email, setEmail] = useState("riku@example.com");
  const [password, setPassword] = useState("password");
  const [displayName, setDisplayName] = useState("リク");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn({
        email,
        password,
        name: displayName,
      });
      navigateTo("/map");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ログインに失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={() => void handleSignIn()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "接続中..." : "新規登録 / ログイン"}
          </button>
        </div>

        {errorMessage && <p className="muted auth-note">{errorMessage}</p>}

        <p className="muted auth-note">
          既存ユーザーがいればログイン、未登録なら新規登録を試みます。
        </p>
      </div>
    </section>
  );
}
