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
        <p className="eyebrow">Sign In</p>
        <h1>Urban Defense Walker</h1>
        <p className="lead">
          Convert real movement into structure deployment, then survive nightly
          auto defense around your home area.
        </p>
        <button type="button" className="primary-button" onClick={handleSignIn}>
          Start solo operation
        </button>
      </div>
    </section>
  );
}
