import { navigateTo } from "../routing/navigation";
import { useAppState } from "../state/AppStateContext";

export function LoginPage() {
  const { signIn } = useAppState();

  const handleSignIn = () => {
    signIn();
    navigateTo("/home");
  };

  return (
    <section className="auth-screen">
      <div className="hero-panel">
        <p className="eyebrow">Login</p>
        <h1>Mission Control</h1>
        <p className="lead">
          画面遷移、グローバル状態、ローカル状態を整理したフロントエンド設計の入口です。
        </p>
        <button type="button" className="primary-button" onClick={handleSignIn}>
          Enter dashboard
        </button>
      </div>
    </section>
  );
}
