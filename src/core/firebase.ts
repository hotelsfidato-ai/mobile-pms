import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, signOut, type Auth } from "firebase/auth";
// @ts-expect-error firebase 12.18.0 lists its plain types before its "react-native" export, so only the phone's build has this
import { getReactNativePersistence } from "firebase/auth";
import { Platform } from "react-native";
import type { HotelsResponse } from "./api";

/* ══════════════════════════════════════════════════════════════════
   FIREBASE ON THE PHONE — src/lib/firebase.ts, the same project and the
   same public settings. They identify the project and authorise nothing
   (the web's own note), so they may sit in a bundle; the API's service
   account never comes near the phone. Expo writes them in when it bundles,
   as it does EXPO_PUBLIC_API_URL, and only spelled out in full like this.

   Firebase takes the password and keeps the person signed in: its own
   record (the ID token and the refresh token) lives in AsyncStorage (M-10),
   through the persistence firebase/auth exports for React Native. The web
   preview has no such export and uses the browser's own store.

   Without the settings `auth` is null: signing in says "not set up in this
   build" and nothing else changes. `measurementId` is the web's analytics,
   and the storage and messaging settings are not used for signing in.
   ══════════════════════════════════════════════════════════════════ */

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** True when every required value is present (the web's own test). */
export const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);

const app = isConfigured ? initializeApp(config) : null;

export const auth: Auth | null = !app ? null
  : Platform.OS === "web" ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

/* ══════════════════════════════════════════════════════════════════
   THE SESSION SURVIVES AN OUTAGE — src/lib/session.ts's loadOrRecall. A
   refusal is the server saying who they are and signs out; a dropped line
   puts the person back with the last good answer, for a week, because the
   sign-in form cannot be completed with no line. Kept: their own name,
   email and properties, nothing about a guest.
   ══════════════════════════════════════════════════════════════════ */

const KEPT = "fidato-last-session";
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function remember(who: HotelsResponse) {
  void AsyncStorage.setItem(KEPT, JSON.stringify({ who, at: Date.now() })).catch(() => {});
}

async function recall(): Promise<HotelsResponse | null> {
  try {
    const kept = JSON.parse((await AsyncStorage.getItem(KEPT)) ?? "null") as { who: HotelsResponse; at: number } | null;
    return kept && Date.now() - kept.at <= WEEK ? kept.who : null;
  } catch {
    return null;
  }
}

export const forget = () => AsyncStorage.removeItem(KEPT).catch(() => {});

/** Ends the Firebase session and what was remembered of it. */
export async function endSession() {
  if (auth?.currentUser) await signOut(auth);
  await forget();
}

/** The session Firebase kept, read again at start. ApiError(0) is a dead
    line. Firebase may have ended the session itself while refreshing the
    token (`auth/user-token-expired`): then nobody is left to put back. */
export async function reopen(load: () => Promise<HotelsResponse>): Promise<HotelsResponse | null> {
  try {
    return await load();
  } catch (error) {
    if ((error as { status?: number }).status === 0 && auth?.currentUser) return recall();
    await endSession();
    return null;
  }
}

/** The web's one sentence for every refusal by Firebase: "no such user" and
    "wrong password" read the same, or the form finds out who is staff.
    A dead line is the phone's own sentence (api.ts), not a wrong password. */
export function signInRefusal(error: unknown): string {
  const e = error as { name?: string; code?: string; message: string };
  if (e?.name === "ApiError") return e.message;
  if (e?.code === "auth/network-request-failed") return "Could not reach the server. Check the connection and try again.";
  return "That email and password do not match.";
}

/** Said on the sign-in screen after a sign-out: held changes wait for their
    person (src/lib/session.ts; "computer" there, a phone here). */
export const keptNotice = (kept: number) => kept === 0 ? null
  : `${kept === 1 ? "1 change is" : `${kept} changes are`} kept on this device and will be sent when you sign in here again.`;
