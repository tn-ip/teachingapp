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
