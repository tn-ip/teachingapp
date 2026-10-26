import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { deleteAccountProgress, enqueueSync, fetchDisplayName, syncProgress } from "./accountSync";
import { emptyProgress, loadProgress, saveProgress, type Progress } from "./progress";
import { claimDeviceProgress, mergeProgress, OWNER_KEY, rememberDeviceProgress } from "./sync";
import { appRedirectUrl, supabase, supabaseConfigured } from "./supabase";

export type AccountPhase = "loading" | "guest" | "syncing" | "saved" | "error";

export type AccountControls = {
  configured: boolean;
  phase: AccountPhase;
  label: string | null;
  banner: string | null;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
  reset: () => Promise<void>;
};

function authErrorFromUrl(): string | null {
  const sources = [window.location.search, window.location.hash.replace(/^#/, "")];
  for (const source of sources) {
    if (!source) continue;
    const params = new URLSearchParams(source.startsWith("?") ? source.slice(1) : source);
    const message = params.get("error_description") || params.get("error");
    if (message) return message.replace(/\+/g, " ");
  }
  return null;
}

export function useAccountSync(
  progress: Progress,
  setProgress: (progress: Progress) => void,
  onHydrated: (progress: Progress) => void,
): AccountControls {
  const configured = supabaseConfigured && supabase != null;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const onHydratedRef = useRef(onHydrated);
  onHydratedRef.current = onHydrated;
  const readyUser = useRef<string | null>(null);
  const pause = useRef(false);
  const phaseRef = useRef<AccountPhase>(configured ? "loading" : "guest");

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [phase, setPhase] = useState<AccountPhase>(phaseRef.current);
  const [label, setLabel] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [signingIn, setSigningIn] = useState(false);

  function showPhase(next: AccountPhase) {
    phaseRef.current = next;
    setPhase(next);
  }

  useEffect(() => {
    if (!supabase) return;
    const fromUrl = authErrorFromUrl();
    if (fromUrl) setBanner(fromUrl);
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setBanner(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const user = session?.user;
    if (!user || !supabase) {
      readyUser.current = null;
      setLabel(null);
      showPhase("guest");
      return;
    }
    const userId = user.id;
    let cancelled = false;
    showPhase("syncing");
    setLabel(user.email ?? "Signed in");
    void fetchDisplayName(userId).then((name) => {
      if (!cancelled && name) setLabel(name);
    });
    const ownerBefore = localStorage.getItem(OWNER_KEY) ?? "guest";
    const switched = ownerBefore !== "guest" && ownerBefore !== userId;
    const claimed = claimDeviceProgress(localStorage, userId);
    if (switched) {
      progressRef.current = claimed;
      onHydratedRef.current(claimed);
    }
    void enqueueSync(async () => {
      const saved = await syncProgress(userId, () => {
        if (switched) return claimed;
        return mergeProgress(loadProgress(), progressRef.current);
      });
      const visible = switched ? saved : mergeProgress(saved, progressRef.current);
      rememberDeviceProgress(localStorage, userId, visible);
      if (cancelled) return;
      readyUser.current = userId;
      onHydratedRef.current(visible);
      showPhase("saved");
      setBanner(null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error(error);
      showPhase("error");
      setBanner("Saved on this iPad. Account sync will retry.");
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, session?.user.id, attempt]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || readyUser.current !== userId || pause.current) return;
    const handle = window.setTimeout(() => {
      void enqueueSync(async () => {
        if (pause.current || readyUser.current !== userId) return;
        let saved = await syncProgress(userId, () => progressRef.current);
        if (pause.current || readyUser.current !== userId) return;
        let visible = mergeProgress(saved, progressRef.current);
        if (JSON.stringify(visible) !== JSON.stringify(saved)) {
          saved = await syncProgress(userId, () => visible);
          if (pause.current || readyUser.current !== userId) return;
          visible = mergeProgress(saved, progressRef.current);
        }
        rememberDeviceProgress(localStorage, userId, visible);
        if (JSON.stringify(visible) !== JSON.stringify(progressRef.current)) {
          progressRef.current = visible;
          setProgress(visible);
        }
        showPhase("saved");
        setBanner(null);
      }).catch((error: unknown) => {
        console.error(error);
        showPhase("error");
        setBanner("Saved on this iPad. Account sync will retry.");
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [progress, session?.user.id, setProgress]);

  useEffect(() => {
    function onOnline() {
      if (phaseRef.current === "error" && readyUser.current) setAttempt((value) => value + 1);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function signIn() {
    if (!supabase) return;
    setSigningIn(true);
    setBanner(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email",
        redirectTo: appRedirectUrl(),
      },
    });
    if (error) {
      setBanner(error.message);
      setSigningIn(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBanner(null);
    const { error } = await supabase.auth.signOut();
    if (error) setBanner(error.message);
  }

  async function reset() {
    const userId = session?.user.id ?? null;
    if (!userId || !supabase) {
      const blank = emptyProgress();
      progressRef.current = blank;
      saveProgress(blank);
      setProgress(blank);
      return;
    }
    pause.current = true;
    try {
      await enqueueSync(async () => {
        await deleteAccountProgress(userId);
      });
      const blank = emptyProgress();
      progressRef.current = blank;
      rememberDeviceProgress(localStorage, userId, blank);
      setProgress(blank);
      showPhase("saved");
      setBanner(null);
    } catch (error) {
      console.error(error);
      showPhase("error");
      setBanner("Could not clear the account copy. Progress on this iPad was kept.");
      throw error;
    } finally {
      pause.current = false;
    }
  }

  return {
    configured,
    phase,
    label,
    banner,
    signingIn,
    signIn,
    signOut,
    retry: () => setAttempt((value) => value + 1),
    reset,
  };
}
