import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { currentSubject, sendHeld } from "./api";
import { drain, isOnline, watchConnection, type OutboxEntry } from "./offline";
import { list, NO_STORE, remove, subscribe, update } from "./outbox";
import { c, face, space, t } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   WHAT IS HELD ON THIS PHONE — the web's OfflineBar
   (src/components/app/OfflineBar.tsx), same sentences. Refused changes
   first (a person has to look), then another person's (they go when
   that person signs in), then this person's, with Send now.
   ══════════════════════════════════════════════════════════════════ */

const store = { list, remove, update };
const RETRY_MS = 30_000;

export function HeldBar() {
  const cache = useQueryClient();
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [noStore, setNoStore] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const [sending, setSending] = useState(false);

  const refresh = useCallback(() => {
    list().then((all) => { setEntries(all); setNoStore(false); }, () => setNoStore(true));
  }, []);

  const send = useCallback(async () => {
    setSending(true);
    const result = await drain(store, sendHeld, currentSubject()).catch(() => null);
    setSending(false);
    setOnline(isOnline());
    refresh();
    /* What was held has landed: every screen showing the old answer is wrong. */
    if (result && result.sent > 0) void cache.invalidateQueries();
  }, [cache, refresh]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribe(refresh);
    const unwatch = watchConnection(() => { setOnline(isOnline()); refresh(); });
    return () => { unsubscribe(); unwatch(); };
  }, [refresh]);

  const me = currentSubject();
  const mine = entries.filter((e) => e.status === "waiting" && (!e.subject || e.subject === me));
  const theirs = entries.filter((e) => e.status === "waiting" && e.subject && e.subject !== me);
  const refusedList = entries.filter((e) => e.status === "rejected");

  /* Sent as soon as the line looks up and something waits. The phone has
     no "online" event: also on coming back to the app, and every 30 s
     while offline with something held (a failed try keeps it offline, a
     sent one empties the list, so it cannot spin). */
  useEffect(() => {
    if (online && mine.length > 0 && !sending) void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mine.length]);
  useEffect(() => {
    if (mine.length === 0) return;
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") void send(); });
    const timer = online ? undefined : setInterval(() => void send(), RETRY_MS);
    return () => { sub.remove(); if (timer) clearInterval(timer); };
  }, [mine.length, online, send]);

  if (online && mine.length === 0 && refusedList.length === 0 && theirs.length === 0) return null;

  return (
    <View style={{ gap: 1 }}>
      {noStore && !online ? (
        <Band tone="red" icon={<AlertTriangle size={16} color={c.red700} />}>
          <Text style={[t.label, { color: c.red700 }]}>{NO_STORE}</Text>
        </Band>
      ) : null}

      {refusedList.length > 0 ? (
        <Band tone="red" icon={<AlertTriangle size={16} color={c.red700} />}>
          <Text style={[t.label, { color: c.red700 }]} accessibilityRole="alert">
            {refusedList.length === 1 ? "One change was refused by the server." : `${refusedList.length} changes were refused by the server.`}
          </Text>
          {refusedList.map((e) => (
            <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[t.caption, { flex: 1, color: c.grey700 }]}>
                <Text style={{ color: c.ink900 }}>{e.label}</Text>  {e.error}
              </Text>
              <Link label="Discard" color={c.red700} onPress={() => void remove(e.id)} />
            </View>
          ))}
        </Band>
      ) : null}

      {theirs.length > 0 ? (
        <Band tone="grey" icon={<CloudOff size={16} color={c.grey500} />}>
          <Text style={[t.caption, { color: c.grey600 }]}>
            {theirs.length === 1
              ? "1 change was made by someone else signed in on this device."
              : `${theirs.length} changes were made by someone else signed in on this device.`}
            {" They will send when that person signs in again."}
          </Text>
        </Band>
      ) : null}

      {!online || mine.length > 0 ? (
        <Band
          tone={online ? "info" : "yellow"}
          icon={online ? <RefreshCw size={16} color={c.info} /> : <CloudOff size={16} color={c.yellow800} />}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[t.caption, { flex: 1, color: online ? c.info : c.yellow800 }]} accessibilityLiveRegion="polite">
              {!online && "No connection. "}
              {mine.length === 0
                ? "Working offline. Anything you can still do will be held."
                : mine.length === 1 ? `1 change held: ${mine[0]!.label}.` : `${mine.length} changes held.`}
              {mine.length > 0 && !online && " They go when the line is back."}
            </Text>
            {mine.length > 0 ? (
              <Link label={sending ? "Sending…" : "Send now"} color={online ? c.info : c.yellow800} onPress={() => void send()} disabled={sending} />
            ) : null}
          </View>
        </Band>
      ) : null}
    </View>
  );
}

const TONES = {
  red: { bg: c.red50, ring: c.red100 },
  grey: { bg: c.grey50, ring: c.grey200 },
  info: { bg: c.info50, ring: c.info100 },
  yellow: { bg: c.yellow50, ring: c.yellow100 },
};

function Band({ tone, icon, children }: { tone: keyof typeof TONES; icon: ReactNode; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: space.side, paddingVertical: 8, backgroundColor: TONES[tone].bg, borderBottomWidth: 1, borderBottomColor: TONES[tone].ring }}>
      <View style={{ paddingTop: 1 }}>{icon}</View>
      <View style={{ flex: 1, gap: 4 }}>{children}</View>
    </View>
  );
}

/** A text button, 44px tall to the touch. */
function Link({ label, color, onPress, disabled }: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={12} style={{ minHeight: 24, justifyContent: "center", opacity: disabled ? 0.6 : 1 }}>
      <Text style={[t.caption, { color, textDecorationLine: "underline", ...face[600] }]}>{label}</Text>
    </Pressable>
  );
}
