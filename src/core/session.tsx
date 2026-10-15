import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { api, setDevSubject, type HotelsResponse } from "./api";

/* ══════════════════════════════════════════════════════════════════
   WHO IS SIGNED IN — GET /api/hotels's answer: the person and the
   properties the API lets them see. Signing in or out empties the read
   cache, so one person never sees the last one's figures (PLAN § 7).
   ══════════════════════════════════════════════════════════════════ */

interface Session {
  who: HotelsResponse | null;
  busy: boolean;
  error: string | null;
  signInAs: (uid: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [who, setWho] = useState<HotelsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInAs(uid: string) {
    setBusy(true);
    setError(null);
    cache.clear();
    setDevSubject(uid);
    try {
      setWho(await api<HotelsResponse>("/api/hotels"));
    } catch (e) {
      setDevSubject(null);
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setDevSubject(null);
    setWho(null);
    cache.clear();
  }

  return <SessionContext.Provider value={{ who, busy, error, signInAs, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside SessionProvider");
  return session;
}
