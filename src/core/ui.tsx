import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
  type PressableAndroidRippleConfig, type PressableStateCallbackType, type StyleProp, type TextInputProps,
  type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { outcomeUnknown } from "./api";
import { stops } from "./stop";
import { c, face, space, t } from "./theme";

/* The few pieces every screen shares, after the web kit (src/components/ui). */

/** One read: what came back, what failed, and a way to ask again. A failed
    re-read keeps the last answer on screen and says it failed. The key
    names the hotel (AGENTS rule 5); react-query keeps the answers (M-4). */
export function useRead<T>(read: () => Promise<T>, key: readonly unknown[]) {
  const q = useQuery({ queryKey: key, queryFn: read });
  return {
    data: q.data,
    error: q.error ? q.error.message : undefined,
    loading: q.isFetching,
    reload: () => { void q.refetch(); },
  };
}

/** ONE INTENT, ONE WRITE when its outcome is unknown (MEMORY 8, 16; PMS R-30). For a write on a
    route that reads no idempotency key, whose repeat would make a second thing (a docket, a
    booking, a round, a block): `stop(e)` in its catch is true, and stuck from then on, when the
    outcome is unknown (`outcomeUnknown`: nothing came back, or a 5xx). Stuck, the button takes no
    more taps (`isStuck()` at the tap, `stuck` to grey it) until this dialog or screen is closed
    and the record read again. A held write and the server's own no never stick. Shared by
    front-desk, pos, housekeeping, guest-services, laundry and reservations (4 Nov). */
export function useStuck() {
  const on = useRef(false);
  const [stuck, setStuck] = useState(false);
  return {
    stuck,
    isStuck: () => on.current,
    stop: (e: unknown) => {
      if (!outcomeUnknown(e)) return false;
      on.current = true;
      setStuck(true);
      return true;
    },
  };
}

/** THE SCREEN'S STOP (m13-stops, 20 Nov; stop.ts): `useStuck` kept inside a sheet is let go by closing
    and reopening it. This one is kept by `name` (the hotel and the record the screen reads, e.g.
    `stores/5EL`) outside every sheet and screen. A sheet sends through `guard(write)` (stopped while
    it is on its way, lost on an unknown outcome) or calls `stop(e)` in its catch; the screen
    wraps the read that shows the record in `watch(read)` and greys every act that could repeat the
    write while `stuck`. Only a read wrapped by `watch` that BEGAN after the loss and came back good
    lets it go - one on its way at the loss, or one that failed, lets nothing go. */
export function useScreenStop(name: string) {
  const stuck = useSyncExternalStore(stops.subscribe, () => stops.stuck(name));
  const unknown = useSyncExternalStore(stops.subscribe, () => stops.unknown(name));
  return {
    /** Grey every act that could repeat the write. */
    stuck,
    /** Lost (not merely on its way): show the `Stopped` line. */
    unknown,
    isStuck: () => stops.stuck(name),
    stop: (e: unknown) => {
      if (!outcomeUnknown(e)) return false;
      stops.lost(name);
      return true;
    },
    /** The write itself: stopped while it is on its way, and lost if its outcome is unknown. */
    guard: async <T,>(write: () => Promise<T>): Promise<T> => {
      const done = stops.sending(name);
      try { return await write(); }
      catch (e) { if (outcomeUnknown(e)) stops.lost(name); throw e; }
      finally { done(); }
    },
    /* react-query hands its queryFn a signal; a read it cancelled (a newer one replaced it) is
       thrown away, so it lets nothing go. */
    watch: <T,>(read: (ctx?: { signal?: AbortSignal }) => Promise<T>) => async (ctx?: { signal?: AbortSignal }): Promise<T> => {
      const ticket = stops.begin();
      const got = await read(ctx);
      if (!ctx?.signal?.aborted) stops.good(name, ticket);
      return got;
    },
  };
}

/** The words for an unknown outcome: "Not known whether it was booked", what came back, and where
    to look first; `line` is the same as one sentence, for a greyed button's reason. */
export function notKnown(done: string, where: string, e?: unknown) {
  const title = `Not known whether it was ${done}`;
  const said = e === undefined ? "" : `${e instanceof Error ? e.message : String(e)} `;
  return { title, body: `${said}Look at ${where} before trying again.`, line: `${title}: look at ${where} before trying again.` };
}

/* ── Native on both phones (docs/NATIVE.md, the owner's 19 Nov) ─────
   The few helpers every screen and kit uses so each phone behaves as its
   own: the ripple on Android, the pressed shade on iPhone (never both),
   a sheet's room round the notch and the home indicator, the right
   keyboard per field, each phone's own "are you sure", a number or an
   address that opens the dialler or the mail. */

/** Android's own press feedback (a Pressable's `android_ripple`): ink at 10%, seen on white and on orange alike. */
export const ripple: PressableAndroidRippleConfig = { color: "rgba(3,23,40,0.10)" };

/** A Pressable's style function, with its pressed shade on iPhone (and the web preview) only:
    Android shows `ripple` instead, never both. `style={shade(({ pressed }) => [...])}`. */
export function shade<S>(style: (state: PressableStateCallbackType) => S) {
  return (state: PressableStateCallbackType): S => style({ ...state, pressed: state.pressed && Platform.OS !== "android" });
}

/** A sheet's or a dialog's room inside a Modal: the bottom clear of the home indicator and Android's
    gesture bar (at least 16), the top clear of the notch for a full-screen one. */
export function useSheetPad() {
  const i = useSafeAreaInsets();
  return { top: i.top, bottom: Math.max(i.bottom, 16), left: i.left, right: i.right };
}

/** What every Modal sets (docs/NATIVE.md): drawn under Android's status and gesture bars, edge to edge as
    the app is, so the sheet pads itself with `useSheetPad`. Spread it: `<Modal {...modalEdge} …>`. */
export const modalEdge = { statusBarTranslucent: true, navigationBarTranslucent: true } as const;

/** The keyboard per field (docs/NATIVE.md). Only the keyboard changes: what is typed and sent is the same.
    A guest's phone or email turns the phone's own autofill off, which would offer the person at the
    desk their own number. */
export const keys = {
  /** An amount or a price: digits and a point. */
  amount: { keyboardType: "decimal-pad", inputMode: "decimal" },
  /** A count: digits only. */
  count: { keyboardType: "number-pad", inputMode: "numeric" },
  phone: { keyboardType: "phone-pad", inputMode: "tel", autoComplete: "off", textContentType: "none" },
  email: { keyboardType: "email-address", inputMode: "email", autoCapitalize: "none", autoCorrect: false, autoComplete: "off", textContentType: "none" },
  /** A code typed in capitals (GSTIN, PAN, a document number). */
  code: { autoCapitalize: "characters", autoCorrect: false },
  /** A person's or a company's name. */
  name: { autoCapitalize: "words", autoComplete: "off", textContentType: "none" },
} as const satisfies Record<string, TextInputProps>;

/** Each phone's own "are you sure" for a destructive act, in the web's words: Cancel, and the act in red.
    The web preview has no native dialog, so it asks with the browser's. */
export function confirmAct(title: string, message: string | undefined, act: string, onYes: () => void, cancel = "Cancel") {
  if (Platform.OS === "web") {
    const ask = (globalThis as { confirm?: (m: string) => boolean }).confirm;
    if (!ask || ask(message ? `${title}\n\n${message}` : title)) onYes();
    return;
  }
  Alert.alert(title, message, [{ text: cancel, style: "cancel" }, { text: act, style: "destructive", onPress: onYes }], { cancelable: true });
}

/** Open the dialler or the mail with what the screen shows. */
export const dial = (phone: string) => { void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`).catch(() => undefined); };
export const mail = (email: string) => { void Linking.openURL(`mailto:${email.trim()}`).catch(() => undefined); };

/** A phone number or an email the screen already shows, in its own style, that opens the dialler or
    the mail (underlined, so it reads as a link). Inside a Text it runs on with the sentence. */
export function Contact({ kind, value, style, numberOfLines }: { kind: "tel" | "mailto"; value: string; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text
      style={[style, { textDecorationLine: "underline" }]} numberOfLines={numberOfLines}
      onPress={() => (kind === "tel" ? dial(value) : mail(value))} accessibilityRole="link"
      accessibilityHint={kind === "tel" ? "Calls this number" : "Writes an email"}
    >{value}</Text>
  );
}

/** A screen: the page's grey, the sides' 20px, pull down to read again. */
export function Screen({ children, refreshing, onRefresh }: { children: ReactNode; refreshing: boolean; onRefresh: () => void }) {
  return (
    <ScrollView
      style={{ backgroundColor: c.grey50 }}
      contentContainerStyle={{ paddingTop: 16, paddingHorizontal: space.side, paddingBottom: 40, gap: space.card }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} colors={[c.orange]} />}
    >
      {children}
    </ScrollView>
  );
}

/** The page head: the date in small capitals, the title, a line under it. */
export function Head({ eyebrow, title, under, action }: { eyebrow?: string; title: string; under?: string; action?: ReactNode }) {
  return (
    <View style={{ marginBottom: space.section - space.card, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <Text style={t.eyebrow}>{eyebrow}</Text> : null}
        <Text style={t.title} accessibilityRole="header">{title}</Text>
        {/* text-sm's 21 px line, as the pictures (the work-orders helper, 4 Nov). */}
        {under ? <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>{under}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** A white tile: a 1px grey-200 hairline, 12px corners. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** A capsule button: 44px on a touch screen, a grey-300 ring, an icon before the words. */
export function Capsule({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} android_ripple={ripple} style={shade(({ pressed }) => [s.capsule, pressed && { backgroundColor: c.grey100 }])}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon}
        <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** A read that failed says so, and what - a dash alone would tell the
    owner the business has no figures. */
export function ReadFailed({ what, error, onRetry }: { what: string; error: string; onRetry: () => void }) {
  return (
    <View style={[s.card, { backgroundColor: c.red50, borderColor: c.red50, gap: 8 }]} accessibilityRole="alert">
      <Text style={[t.heading, { color: c.red700 }]}>Could not read {what}</Text>
      <Text style={[t.label, { color: c.grey700 }]}>{error}</Text>
      <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={onRetry} /></View>
    </View>
  );
}

/** A screen stopped by `useScreenStop`: why its acts are grey (`notKnown(...).line`), and a way to read
    the record again - the read that lets it go. */
export function Stopped({ line, onRead, act = "Read it again" }: { line: string; onRead: () => void; act?: string }) {
  return (
    <View accessibilityRole="alert" style={{ gap: 8, padding: space.cardX, borderRadius: 12, backgroundColor: c.red50 }}>
      <Text style={[t.label, face[600], { color: c.red700 }]}>{line}</Text>
      <View style={{ flexDirection: "row" }}><Capsule label={act} onPress={onRead} /></View>
    </View>
  );
}

/** A labelled value on one line, label left, value right (the Figure Rule's rows). */
export function Row({ label, value, strong, onNavy }: { label: string; value: string; strong?: boolean; onNavy?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[t.label, { color: onNavy ? c.onNavy : c.grey500, flexShrink: 1 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: onNavy ? c.white : strong ? c.ink900 : c.grey700, ...face[strong ? 600 : 500] }]}>{value}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200,
    paddingHorizontal: space.cardX, paddingVertical: space.cardY,
  },
  navy: { backgroundColor: c.ink900, borderRadius: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY },
  capsule: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.grey300,
    backgroundColor: c.white, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 4 },
  hairline: { height: 1, backgroundColor: c.grey100, marginVertical: 8 },
});
