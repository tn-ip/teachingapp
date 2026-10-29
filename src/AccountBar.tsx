import type { AccountControls } from "./useAccountSync";

export function AccountBar({ account }: { account: AccountControls }) {
  if (!account.configured) return null;
  const signedIn = Boolean(account.label);
  return (
    <div className="account-slot">
      {account.phase === "loading" ? <p className="sync-note">Checking sign-in…</p> : null}
      {!signedIn && account.phase !== "loading" ? (
        <button
          type="button"
          className="microsoft"
          onClick={() => void account.signIn()}
          disabled={account.signingIn}
        >
          <svg className="microsoft-mark" viewBox="0 0 21 21" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          {account.signingIn ? "Signing in…" : "Sign in with Microsoft"}
        </button>
      ) : null}
      {signedIn ? (
        <div className="account">
          <span className="account-name" title={account.label ?? undefined}>
            {account.label}
          </span>
          <button type="button" className="ghost account-out" onClick={() => void account.signOut()}>
            Sign out
          </button>
        </div>
      ) : null}
      {account.phase === "syncing" ? <p className="sync-note">Saving to your account…</p> : null}
      {account.phase === "saved" && signedIn ? (
        <p className="sync-note">Saved to your account</p>
      ) : null}
      {account.banner ? (
        <p className="sync-note error" role="alert">
          {account.banner}
        </p>
      ) : null}
      {account.phase === "error" && signedIn ? (
        <button type="button" className="ghost account-out" onClick={account.retry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
