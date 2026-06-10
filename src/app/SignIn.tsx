// Shown when Okta SSO is enabled and the visitor isn't signed in yet.
export default function SignIn() {
  return (
    <div className="signin-screen">
      <div className="signin-card">
        <span className="brand-mark" role="img" aria-label="Goatsana">
          🐐
        </span>
        <h1>Goatsana</h1>
        <p>Sign in with your Cribl account to continue.</p>
        <a className="btn btn-primary signin-btn" href="/api/auth/signin">
          Sign in with Okta
        </a>
      </div>
    </div>
  );
}
