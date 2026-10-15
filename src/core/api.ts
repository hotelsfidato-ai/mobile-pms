/* ══════════════════════════════════════════════════════════════════
   THE PHONE'S API CLIENT — src/lib/api.ts, cut to what the phone does.

   WHERE: EXPO_PUBLIC_API_URL when `expo start` was given one (the mobile
   chat's own local API), else the live API. Expo writes the value in when
   it bundles; no file holds it.

   WHO: on a development run only, the API's development header names a
   test person (the API's ALLOW_DEV_AUTH, the web's "Development only"
   buttons). `__DEV__` is false in every release build, so a build that
   reaches a phone never sends it, and the live API refuses it anyway.
   Email and password through Firebase come with the live setup.

   Reads only, so far: the web's offline rules (src/lib/offline.ts) are for
   writes, and arrive with the first slice that writes (M-1).
   ══════════════════════════════════════════════════════════════════ */

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.fidatohotels.com";

let devSubject: string | null = null;
export const setDevSubject = (subject: string | null) => {
  if (__DEV__) devSubject = subject;
};

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (__DEV__ && devSubject) headers["x-dev-staff-id"] = devSubject;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers });
  } catch {
    throw new ApiError(0, __DEV__
      ? `Could not reach ${API_URL}. Is the API running, and is the phone on the same Wi-Fi?`
      : "Could not reach the server. Check the connection and try again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; reason?: string; message?: string } | null;
    throw new ApiError(
      response.status,
      body?.error ?? body?.reason ?? body?.message ?? `Request failed (${response.status}).`,
    );
  }
  return (await response.json()) as T;
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
  scope: { fullName: string; isGroupAdmin: boolean; hotels: Array<{ hotelId: string; role: string }> };
  hotels: Hotel[];
}
