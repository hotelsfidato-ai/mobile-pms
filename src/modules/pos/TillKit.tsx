import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight, Compass, LayoutGrid, Printer, Receipt, Send } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError, HeldError, send } from "../../core/api";
import { newKey } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { notKnown, useStuck } from "../../core/ui";
import { kotLines, maySetUpKots, startCard, type KotKind } from "./floor";
import { Btn, Field, Input, OVERLAY, SheetHead, sheetCard, sheetFooter, ty, type Said } from "./TablesKit";
import { orderHref, padHref, PARCEL_NAMELESS, parcelBody, rowFigure, rowLabel, rowLine, type TillRow } from "./till";
import type { Order } from "./types";

/* ══════════════════════════════════════════════════════════════════
   WHAT THE TILL AND THE TERMINAL SHARE (lane m13-till, 19 Nov) - their
   pieces after the web's (one folder up): Till.tsx OrderRow 583-642,
   components/NewParcel.tsx, components/KotStation.tsx KotStatus,
   components/app/StartHere.tsx. Tables' own NewParcel and StartHere are
   not exported (Tables.tsx is the tables lane's), so the parcel is ported
   again here for an outlet of the screen's choosing. The kit's buttons,
   fields and words are TablesKit's; the sheet follows docs/NATIVE.md
   (safe areas, the back gesture, the keyboard lifted).
   ══════════════════════════════════════════════════════════════════ */

/** Opened: the order, and its pad over it (till.ts orderHref, padHref). */
export function goToOrder(code: string, order: Pick<Order, "id" | "table">) {
  router.push(orderHref(code, order.id));
  router.push(padHref(code, order.id, order.table));
}

/** Press feedback (NATIVE.md): Android's ripple, iPhone's pressed shade, never both. */
export const ripple = Platform.OS === "android" ? { color: c.grey200 } : undefined;
export const shade = (pressed: boolean) => (Platform.OS === "ios" && pressed ? c.grey50 : c.white);

/* ── A row of the lists (Till.tsx OrderRow) ────────────────────────── */

export function OrderRow({ row, withDate = false, onOpen }: { row: TillRow; withDate?: boolean; onOpen: () => void }) {
  const figure = rowFigure(row);
  return (
    <Pressable
      onPress={onOpen} android_ripple={ripple} accessibilityRole="button" accessibilityLabel={rowLabel(row, withDate)}
      style={({ pressed }) => ({
        minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: shade(pressed),
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]} numberOfLines={2}>
          {row.orderNo}
          {row.table ? <Text style={{ color: c.grey500 }}> · {row.table}</Text> : null}
        </Text>
        <Text style={[t.caption, ty.xs]}>{rowLine(row, withDate)}</Text>
      </View>
      <Text style={[t.label, ty.md, t.tab, { color: figure.struck ? c.grey500 : c.ink900, textDecorationLine: figure.struck ? "line-through" : "none" }]}>
        {figure.text}
      </Text>
      <ChevronRight size={16} color={c.grey400} />
    </Pressable>
  );
}

/** A card with the web's CardHeader title over a divided list. */
export function ListCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      <Text style={[t.heading, { paddingHorizontal: space.cardX, paddingVertical: space.cardY }]} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

/* ── The KOT printer lines (KotStation.tsx KotStatus; Tables draws the same) ── */

/** This phone's id for the KOT read: it is never a printing computer. */
const DEVICE = newKey();

export function KotStrip({ code, role, onSay }: { code: string; role: string | null; onSay: (said: Said) => void }) {
  const kot = useQuery({
    queryKey: ["pos", code, "till", "kot"],
    queryFn: () => api<{ kinds: KotKind[] }>(`/api/hotels/${code}/till/kot-setup?device=${DEVICE}`),
  });
  const lines = kot.data ? kotLines(kot.data.kinds) : [];
  if (lines.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {lines.map((k) => (
        <View
          key={k.id} accessibilityRole={k.printing ? undefined : "alert"}
          style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
            k.printing ? null : { borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50 }]}
        >
          <Printer size={16} color={k.printing ? c.grey600 : c.red700} />
          <Text style={[t.label, ty.sm, { flex: 1, color: k.printing ? c.grey600 : c.red700 }]}>{k.text}</Text>
          {!k.printing && maySetUpKots(role) ? (
            <Pressable
              onPress={() => onSay({ title: "Set up", body: "On the website for now", tone: "held" })}
              accessibilityRole="link" accessibilityHint="On the website for now"
              style={{ minHeight: 44, marginVertical: -11, justifyContent: "center" }}
            >
              <Text style={[t.label, ty.sm, { color: c.red700, textDecorationLine: "underline" }]}>Set up</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/* ── Start here on the Till (StartHere.tsx; startHereCards.ts atTheTables) ──
   The waiter's and the Bar person's card shows on Tables and on the Till.
   Here its first two jobs open Tables (the arrow), the third is done on
   this screen. "Got it" is Tables' (one card, one answer from the server). */

const JOB_ICONS = [LayoutGrid, Send, Receipt];

export function TillStartHere({ code, role, onSay }: { code: string; role: string | null; onSay: (said: Said) => void }) {
  const card = startCard(role);
  /* The same question, under the same key, as Tables asks it. */
  const me = useQuery({
    queryKey: ["pos", code, "tables", "me"],
    queryFn: () => api<{ scope: { startHereDismissed?: boolean } }>("/api/hotels"),
    enabled: card != null,
  });
  const [saving, setSaving] = useState(false);
  if (!card || !me.data || me.data.scope.startHereDismissed) return null;
  async function putAway() {
    setSaving(true);
    try {
      await send("PUT", "/api/me/preferences", { startHereDismissed: true });
      void me.refetch();
      onSay({ title: "Put away", body: "Bring it back any time from your account menu.", tone: "ok" });
    } catch (e) {
      onSay(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: "Not remembered", body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.orange50, alignItems: "center", justifyContent: "center" }}>
          <Compass size={20} color={c.orange700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.heading, ty.md]} accessibilityRole="header">Start here</Text>
          <Text style={[t.label, ty.sm, { marginTop: 2 }]}>{card.intro}</Text>
        </View>
        <Btn label="Got it" size="sm" busy={saving} onPress={() => void putAway()} />
      </View>
      <View style={{ marginTop: 16, gap: 6 }}>
        {card.tasks.map((task, i) => {
          const Icon = JOB_ICONS[i]!;
          /* On the Till only the third job is done here (its `to` is /pos/:code/till). */
          const here = i === 2;
          const body = (
            <>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={c.grey500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.label, ty.md, { color: c.ink900 }]}>{task.job}</Text>
                <Text style={[t.label, ty.sm, { marginTop: 2 }]}>{task.how}</Text>
              </View>
            </>
          );
          const box = { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, padding: 12 };
          return here ? (
            <View key={task.job} style={box}>
              {body}
              <Text style={[t.caption, ty.xs, { marginTop: 4 }]}>On this screen</Text>
            </View>
          ) : (
            <Pressable
              key={task.job} onPress={() => router.push(`/pos/${code}/tables`)} android_ripple={ripple}
              accessibilityRole="link" accessibilityLabel={`${task.job}: ${task.how}`}
              style={({ pressed }) => [box, { backgroundColor: shade(pressed) }]}
            >
              {body}
              <ChevronRight size={16} color={c.grey300} style={{ marginTop: 4 }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ── A dialog over the screen, as docs/NATIVE.md asks ─────────────── */

export function TillSheet({ open, onClose, title, description, footer, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; footer: ReactNode; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: OVERLAY, justifyContent: "center", paddingHorizontal: 16, paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 32) }}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={sheetCard}>
          <SheetHead title={title} description={description} onClose={onClose} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: space.side, paddingVertical: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={sheetFooter}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── New parcel (components/NewParcel.tsx, D27-359) ─────────────────
   A parcel has no table: it is named by its customer, with a phone to
   call when it is ready. Held offline it has no order yet, so nothing
   opens: the held bar says it waits. The route reads no idempotency key
   (PMS R-13): one tap, one parcel (latched), and after an unknown outcome
   no more taps until this is closed and the list read again (MEMORY 16). */

export function NewParcelSheet({ code, outlet, onCancel, onHeld, onOpened }: {
  code: string; outlet: string; onCancel: () => void; onHeld: (said: Said) => void; onOpened: (order: Order, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inFlight = useRef(false);
  const once = useStuck();
  const where = "the open orders once this is closed";
  const unknown = notKnown("opened", where);

  async function create() {
    if (!name.trim()) { setProblem(PARCEL_NAMELESS); return; }
    if (inFlight.current || once.isStuck()) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const order = await send<Order & { ok: true }>("POST", `/api/hotels/${code}/till/orders`, parcelBody(outlet, name, phone));
      onOpened(order, name.trim());
    } catch (e) {
      if (e instanceof HeldError) onHeld({ title: "Saved on this phone", body: e.message, tone: "held" });
      else if (once.stop(e)) setProblem(`${unknown.title}. ${notKnown("opened", where, e).body}`);
      else setProblem(e instanceof ApiError || e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <TillSheet
      open onClose={onCancel} title="New parcel"
      footer={(
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Btn label="Cancel" size="md" onPress={onCancel} />
          <Btn label="Open the parcel" size="md" primary busy={busy} disabled={once.stuck} hint={once.stuck ? unknown.line : undefined} onPress={() => void create()} />
        </View>
      )}
    >
      <Field label="Customer's name">
        <Input value={name} onChangeText={setName} maxLength={60} autoFocus autoCapitalize="words" textContentType="name"
          accessibilityLabel="Customer's name" returnKeyType="next" />
      </Field>
      <Field label="Phone" hint="To call when it is ready. Not needed.">
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" textContentType="telephoneNumber"
          autoComplete="tel" accessibilityLabel="Phone" onSubmitEditing={() => void create()} />
      </Field>
      {problem ? <Text style={[t.label, ty.sm, { color: c.red700 }]} accessibilityRole="alert">{problem}</Text> : null}
    </TillSheet>
  );
}

/** A line that a write did not go, in the screen's own place (not a toast). */
export const Problem = ({ text }: { text: string }) => (
  <Text style={[t.label, ty.sm, { color: c.red700, ...face[500] }]} accessibilityRole="alert">{text}</Text>
);
