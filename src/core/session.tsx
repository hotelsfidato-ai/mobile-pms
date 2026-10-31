import { useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, currentSubject, setDevSubject, type HotelsResponse } from "./api";
import { auth, endSession, forget, keptNotice, remember, reopen, signInRefusal } from "./firebase";
import { list } from "./outbox";
import { PasswordDue } from "./SignIn";

/* ══════════════════════════════════════════════════════════════════
   WHO IS SIGNED IN — GET /api/hotels's answer: the person and the
   properties the API lets them see (src/lib/session.ts). Firebase answers
   who they are, the API what they may do. Signing in or out empties the
   read cache, so one person never sees the last one's figures (PLAN § 7).
   Held changes stay through a sign-out, under the name of whoever made
   them (the owner, 28 September).
   ══════════════════════════════════════════════════════════════════ */

interface Session {
  who: HotelsResponse | null;
  busy: boolean;
  error: string | null;
  /** Said on the sign-in screen after a sign-out: changes still waiting. */
  notice: string | null;
  /** Firebase is still reading the session it kept. */
  starting: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAs: (uid: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

async function read() {
  const who = await api<HotelsResponse>("/api/hotels");
  remember(who);
  return who;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [who, setWho] = useState<HotelsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    const held = auth;
    void held.authStateReady()
      .then(() => (held.currentUser ? reopen(read) : null))
      .then(setWho, () => setWho(null))
      .finally(() => setStarting(false));
    /* Firebase ends a session itself when the account is switched off or its
       password changes. The web stays on its screens with every read refused;
       here the person goes to sign-in and the lists go with them. */
    return onAuthStateChanged(held, (user) => {
      if (user || currentSubject()) return;
      setWho(null);
      cache.clear();
      void forget();
    });
  }, [cache]);

  async function signIn(email: string, password: string) {
    if (!auth) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    cache.clear();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setWho(await read());
    } catch (e) {
      /* Refused by the API or no line to ask it: nothing stays behind that
         would sign them in unseen at the next start. */
      await endSession();
      setError(signInRefusal(e));
    } finally {
      setBusy(false);
    }
  }

  async function signInAs(uid: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
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

  async function signOut() {
    const me = currentSubject();
    const kept = (await list().catch(() => [])).filter((e) => e.status === "waiting" && (!e.subject || e.subject === me));
    setDevSubject(null);
    await endSession();
    setWho(null);
    cache.clear();
    setError(null);
    setNotice(keptNotice(kept.length));
  }

  return (
    <SessionContext.Provider value={{ who, busy, error, notice, starting, signIn, signInAs, signOut }}>
      {children}
      {who ? <PasswordDue staffId={who.scope.staffId} email={who.scope.email} /> : null}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside SessionProvider");
  return session;
}

/** This person's role at a property, `owner` for a group administrator:
    the API's own `roleAt` (api/src/modules/housekeeping/repairRoles.ts). */
export function roleAt(who: HotelsResponse, code: string): string | null {
  if (who.scope.isGroupAdmin) return "owner";
  const id = who.hotels.find((h) => h.code === code)?.id;
  return who.scope.hotels.find((h) => h.hotelId === id)?.role ?? null;
}
