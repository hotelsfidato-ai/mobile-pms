/* ══════════════════════════════════════════════════════════════════
   THE PHONE'S API CLIENT — src/lib/api.ts, cut to what the phone does.

   WHERE: EXPO_PUBLIC_API_URL when `expo start` was given one (the mobile
   chat's own local API), else the live API. Expo writes the value in when
   it bundles; no file holds it.

   WHO: the signed-in person's Firebase token on every request (the web's
   authHeaders). On a development run only, the API's development header
   names a test person instead (the API's ALLOW_DEV_AUTH, the web's
   "Development only" buttons). `__DEV__` is false in every release build,
   so a build that reaches a phone never sends it, and the live API refuses
   it anyway.

   WRITES go through `send`: the web's tiers (./offline.ts) decide what is
   held when nothing leaves the phone, and the idempotency key is minted at
   the tap and sent from the first attempt (M-5), so a lost reply can never
   make a second repair.
   ══════════════════════════════════════════════════════════════════ */

import { auth } from "./firebase";
import { newKey, noteReachable, noteUnreachable, ruleFor, type OutboxEntry } from "./offline";
import type { KeyKeeper } from "./keys";
import { enqueue } from "./outbox";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.fidatohotels.com";

let devSubject: string | null = null;
export const setDevSubject = (subject: string | null) => {
  if (__DEV__) devSubject = subject;
};

/** The person who acted, stamped on a held change (the web's currentSubject). */
export const currentSubject = () => (__DEV__ && devSubject ? devSubject : auth?.currentUser?.uid ?? "");

/* Awaited inside each request's try, as on the web: offline with an expired
   token, getIdToken fails as the request would, and a write is held, not lost. */
async function who(): Promise<Record<string, string>> {
  if (__DEV__ && devSubject) return { "x-dev-staff-id": devSubject };
  const user = auth?.currentUser;
  /* getIdToken refreshes when the token is near expiry, so a clerk on a
     twelve-hour shift is not signed out mid-check-in. */
  return user ? { authorization: `Bearer ${await user.getIdToken()}` } : {};
}

export class ApiError extends Error {
  /** `needs`: what the server says would satisfy a refusal (MFIN-2), when it says. */
  constructor(readonly status: number, message: string, readonly needs?: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** A write that could not leave the phone and is held to send later. */
export class HeldError extends Error {
  constructor(message: string, readonly entryId: string, readonly warn: boolean) {
    super(message);
    this.name = "HeldError";
  }
}

async function refused(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string; reason?: string; message?: string; needs?: string } | null;
  return new ApiError(
    response.status,
    body?.error ?? body?.reason ?? body?.message ?? `Request failed (${response.status}).`,
    typeof body?.needs === "string" ? body.needs : undefined,
  );
}

export async function api<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers: await who() });
  } catch {
    noteUnreachable();
    throw new ApiError(0, __DEV__
      ? `Could not reach ${API_URL}. Is the API running, and is the phone on the same Wi-Fi?`
      : "Could not reach the server. Check the connection and try again.");
  }
  noteReachable();
  if (!response.ok) throw await refused(response);
  return (await response.json()) as T;
}

/** A write. Tried at once; when nothing leaves the phone it is held or
    refused by the web's tiers (HeldError / ApiError 503 with the reason).
    `keeper` (keys.ts, MFIN-1): the same request tried again keeps its key,
    so a write whose reply was lost is never made twice; without one, each
    call has its own key, minted at the tap. */
export async function send<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, keeper?: KeyKeeper,
): Promise<T> {
  const text = body === undefined ? undefined : JSON.stringify(body);
  const key = keeper ? keeper.keyFor(method, path, text) : newKey();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(await who()), "content-type": "application/json", "idempotency-key": key },
      ...(text === undefined ? {} : { body: text }),
    });
  } catch {
    noteUnreachable();
    const rule = ruleFor(path, method, text);
    if (rule.tier === "refuse") throw new ApiError(503, rule.reason!);
    const entry = await enqueue({
      label: rule.label,
      path,
      method,
      body: text,
      idempotencyKey: key,
      hotelId: path.match(/\/api\/hotels\/([^/]+)/)?.[1] ?? "",
      subject: currentSubject(),
    });
    /* The web says the check-in sentence for every warned write (R-14); a
       room charge's own risk is the guest leaving first (offline.ts, 8 Sep). */
    const warning = rule.label === "Room charge"
      ? "It is not confirmed until then - the guest could check out in the meantime."
      : "It is not confirmed until then - the room could be taken by another desk in the meantime.";
    throw new HeldError(
      rule.tier === "queue-warn"
        ? `${rule.label} is held and will be sent when the connection is back. ${warning}`
        : `${rule.label} is held and will be sent when the connection is back.`,
      entry.id,
      rule.tier === "queue-warn",
    );
  }
  noteReachable();
  if (!response.ok) throw await refused(response);
  keeper?.landed(method, path, text);
  return (await response.json()) as T;
}

/** One held change, sent again with the SAME key it was given at the tap. */
export async function sendHeld(entry: OutboxEntry): Promise<Response> {
  return fetch(`${API_URL}${entry.path}`, {
    method: entry.method,
    headers: { ...(await who()), "content-type": "application/json", "idempotency-key": entry.idempotencyKey },
    ...(entry.body === undefined ? {} : { body: entry.body }),
  });
}

/** A property the caller may not see has no figures: a dash, not an error
    (the web's fetchOr). Anything else is a real failure and is shown. */
export async function orNull<T>(path: string, alsoNull: number[] = []): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || alsoNull.includes(error.status))) return null;
    throw error;
  }
}

/* The signed-in person's properties, as GET /api/hotels answers. */
/** src/lib/api.ts ApiHotel. */
export interface Hotel {
  /** Matches scope.hotels[].hotelId (the role there). */
  id: string;
  code: string;
  name: string;
  businessDate: string;
  /** The property's real date in its own time zone (D27-237). */
  today?: string;
  /** A test hotel's real hotel, by code (D27-296); null for a real one. */
  testOf?: string | null;
}
/** src/lib/api.ts HotelsResponse. */
export interface HotelsResponse {
  scope: { staffId: string; email: string; fullName: string; isGroupAdmin: boolean; hotels: Array<{ hotelId: string; role: string }> };
  hotels: Hotel[];
}
