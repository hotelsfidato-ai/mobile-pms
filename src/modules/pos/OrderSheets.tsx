import type { LucideIcon } from "lucide-react-native";
import { Phone, UserRound } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
} from "react-native";
import { api, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import {
  CHANNELS, discountBody, headerBody, headerForm, orderPath, type Act, type Ask, type HeaderForm,
} from "./order";
import type { Order, PromotionList } from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE ORDER'S QUESTIONS, as sheets from the bottom: the web's dialogs
   (components/AskDialog.tsx, Till.tsx DiscountDialog 284-781,
   flows/OrderHeaderPanel.tsx), their words and their order. A refusal
   is read in the sheet that asked, in the server's words; a held write
   closes it and is said on the order.
   ══════════════════════════════════════════════════════════════════ */

/** What a write came to: the order's screen runs it (Order.tsx). */
/** `unknown`: nothing came back, or a 5xx - it may have been made (MEMORY 16). */
export type Outcome = { done: true } | { held: string } | { refused: string; unknown?: boolean };
export type Write = (act: Act, reason?: string) => Promise<Outcome>;

/** A button 44px or more to the touch. `why`: refused for this person -
    grey, but the tap still lands and says why (Rooms.tsx `Act`). */
export function Btn({ label, onPress, kind = "secondary", Icon, off, why, onRefused, busy, a11y, grow, small }: {
  label: string; onPress: () => void; kind?: "primary" | "secondary" | "ghost"; Icon?: LucideIcon; off?: boolean;
  why?: string | null; onRefused?: (why: string) => void; busy?: boolean; a11y?: string; grow?: boolean;
  /** A line's own button: 44px, the smaller words (the web's h-11 text-sm). */
  small?: boolean;
}) {
  const grey = off || why != null;
  const fg = grey ? c.grey500 : kind === "primary" ? c.white : c.ink900;
  return (
    <Pressable
      onPress={() => (off || busy ? undefined : why != null ? onRefused?.(why) : onPress())}
      disabled={off}
      accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: grey, busy: Boolean(busy) }} accessibilityHint={why ?? undefined}
      style={({ pressed }) => ({
        minHeight: small ? 44 : 48, paddingHorizontal: small ? 12 : 14, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        ...(grow ? { flex: 1 } : {}),
        borderWidth: kind === "secondary" ? 1 : 0, borderColor: grey ? c.grey200 : c.grey300,
        backgroundColor: kind === "primary" ? (grey ? c.grey200 : pressed ? c.orange700 : c.orange600)
          : kind === "secondary" ? (grey ? c.grey100 : pressed ? c.grey100 : c.white) : pressed ? c.grey100 : "transparent",
        opacity: busy ? 0.6 : 1,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[small ? t.label : t.heading, { color: fg, ...face[kind === "ghost" || small ? 500 : 600] }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** A sheet from the bottom: the title, what it is about, its fields, its buttons. */
export function Sheet({ visible, onClose, title, description, children, footer }: {
  visible: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer: ReactNode;
}) {
  return (
    /* No slide in the web preview: a tab in the background never ends a CSS
       animation, and the closed sheet stayed over the order (MEMORY 4's pane). */
    <Modal visible={visible} transparent animationType={Platform.OS === "web" ? "none" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1, minHeight: 48 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "88%" }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 12, gap: 14 }}>
              <View style={{ gap: 4 }}>
                <Text style={t.heading} accessibilityRole="header">{title}</Text>
                {description ? <Text style={t.label}>{description}</Text> : null}
              </View>
              {children}
            </ScrollView>
            <View style={{ paddingHorizontal: space.side, paddingTop: 8, paddingBottom: 20, gap: 8, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              {footer}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.ink900, ...face[600] }]}>
        {label}{required ? <Text style={{ color: c.red700 }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ label, number, multiline, ...props }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; autoFocus?: boolean;
  number?: boolean; multiline?: boolean; editable?: boolean;
}) {
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      multiline={multiline}
      keyboardType={number ? "decimal-pad" : "default"}
      placeholderTextColor={c.grey500}
      style={{
        minHeight: multiline ? 72 : 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
        borderColor: c.grey300, backgroundColor: props.editable === false ? c.grey50 : c.white, fontSize: 16, color: c.ink900, ...face[500],
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

/** One choice of several, the web's orange ring when chosen. */
export function Choice({ label, on, onPress, grow }: { label: string; on: boolean; onPress: () => void; grow?: boolean }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
        ...(grow ? { flexGrow: 1, flexBasis: "45%" } : {}),
        borderColor: on ? c.orange : c.grey300, backgroundColor: on ? c.orange50 : pressed ? c.grey50 : c.white,
      })}
    >
      <Text style={[t.label, { color: on ? c.orange700 : c.grey700 }]}>{label}</Text>
    </Pressable>
  );
}

export const Eyebrow = ({ children }: { children: string }) => <Text style={t.eyebrow}>{children}</Text>;
export const Refused = ({ text }: { text: string | null }) =>
  text ? <Text style={[t.label, { color: c.red700 }]} accessibilityRole="alert">{text}</Text> : null;

/* ── A reason, a note or "are you sure?" (AskDialog.tsx) ───────────── */

export function AskSheet({ ask, onClose, onConfirm }: {
  ask: Ask | null; onClose: () => void; onConfirm: (text: string) => Promise<Outcome>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const close = () => { setText(""); setRefused(null); onClose(); };
  const blocked = busy || Boolean(ask?.field?.required && !text.trim());
  const go = async () => {
    if (!ask || blocked) return;
    setBusy(true);
    setRefused(null);
    const out = await onConfirm(text.trim()).finally(() => setBusy(false));
    if ("refused" in out) setRefused(out.refused);
    else close();
  };
  return (
    <Sheet
      visible={ask != null} onClose={close} title={ask?.title ?? ""}
      footer={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" onPress={close} grow />
          <Btn label={ask?.confirm ?? ""} kind="primary" onPress={() => void go()} off={blocked} busy={busy} grow />
        </View>
      )}
    >
      {ask?.body ? <Text style={[t.label, { color: c.grey700 }]}>{ask.body}</Text> : null}
      {ask?.field ? (
        <Field label={ask.field.label} required={ask.field.required}>
          <Input label={ask.field.label} value={text} onChangeText={setText} multiline autoFocus />
        </Field>
      ) : null}
      <Refused text={refused} />
    </Sheet>
  );
}

/* ── The discount (Till.tsx DiscountDialog) ────────────────────────── */

export function DiscountSheet({ hotel, order, onClose, write }: {
  hotel: Hotel; order: Order; onClose: () => void; write: Write;
}) {
  const code = hotel.code;
  /* Read while the sheet is open, as the web (only when the dialog opens). */
  const promos = useRead(() => api<PromotionList>(`/api/hotels/${code}/till/promotions`), ["pos", code, "order", "promotions"]);
  const [type, setType] = useState<"percent" | "fixed">(order.discountType ?? "percent");
  const [value, setValue] = useState(order.discountValue === null ? "" : String(order.discountValue));
  const [reason, setReason] = useState(order.discountReason ?? "");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const cap = promos.data?.freehandCapPercent ?? null;
  const running = (promos.data?.promotions ?? []).filter((p) => p.isActive);
  const body = discountBody(type, value, reason);
  const base = orderPath(code, order.id);

  const run = async (act: Act) => {
    setBusy(true);
    setRefused(null);
    const out = await write(act).finally(() => setBusy(false));
    if ("refused" in out) setRefused(out.refused);
    else onClose();
  };

  return (
    <Sheet
      visible onClose={onClose} title="Discount this bill" description="Off the net, so the tax falls with it."
      footer={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          {order.discount > 0 ? (
            <Btn label="Remove" kind="ghost" busy={busy}
              onPress={() => void run({ method: "POST", path: `${base}/discount/clear`, body: () => undefined, ask: null })} />
          ) : null}
          <Btn label="Cancel" onPress={onClose} grow />
          <Btn label="Apply" kind="primary" off={!body || busy} busy={busy} grow
            onPress={() => body && void run({ method: "POST", path: `${base}/discount`, body: () => body, ask: null })} />
        </View>
      )}
    >
      {running.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Eyebrow>Promotions</Eyebrow>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {running.map((p) => (
              <Btn key={p.id} label={`${p.name}  ${p.kind === "percent" ? `${p.value}%` : cash(p.value)}`} busy={busy} grow
                onPress={() => void run({ method: "POST", path: `${base}/promotion`, body: () => ({ code: p.code }), ask: null })} />
            ))}
          </View>
          <Text style={t.label}>Applied by name, so the bill and the month-end report say the same thing.</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ height: 1, flex: 1, backgroundColor: c.grey200 }} />
            <Text style={t.eyebrow}>or by hand</Text>
            <View style={{ height: 1, flex: 1, backgroundColor: c.grey200 }} />
          </View>
        </View>
      ) : null}
      {!promos.data && promos.loading ? <Text style={t.caption}>Reading the promotions…</Text> : null}
      {!promos.data && promos.error ? <Text style={[t.caption, { color: c.red700 }]}>The promotions could not be read. {promos.error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        <Choice label="Percentage" on={type === "percent"} onPress={() => setType("percent")} grow />
        <Choice label="Fixed amount" on={type === "fixed"} onPress={() => setType("fixed")} grow />
      </View>
      <Field label={type === "percent" ? "Percent off" : "Amount off"} required>
        <Input label={type === "percent" ? "Percent off" : "Amount off"} value={value} onChangeText={setValue}
          placeholder={type === "percent" ? "10" : "100.00"} number autoFocus />
      </Field>
      {/* The server's cap, as its number. No rupees are worked out on the phone. */}
      {cap !== null ? <Text style={t.label}>Up to {cap}% by hand.</Text> : null}
      <Field label="Why" required hint="A staff meal, a complaint, a manager's call. It stays on the record.">
        <Input label="Why" value={reason} onChangeText={setReason} placeholder="Manager comp" />
      </Field>
      <Refused text={refused} />
    </Sheet>
  );
}

/* ── The order header (OrderHeaderPanel.tsx) ───────────────────────── */

export function HeaderSheet({ hotel, order, onClose, write }: {
  hotel: Hotel; order: Order; onClose: () => void; write: Write;
}) {
  const code = hotel.code;
  const waiters = useRead(
    () => api<{ waiters: { id: string; name: string }[] }>(`/api/hotels/${code}/till/waiters`).then((b) => b.waiters),
    ["pos", code, "order", "waiters"],
  );
  const [f, setF] = useState<HeaderForm>(() => headerForm(order));
  const set = (patch: Partial<HeaderForm>) => setF((x) => ({ ...x, ...patch }));
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setRefused(null);
    const out = await write({ method: "PATCH", path: orderPath(code, order.id), body: () => headerBody(f), ask: null })
      .finally(() => setBusy(false));
    if ("refused" in out) setRefused(out.refused);
    else onClose();
  };

  return (
    <Sheet
      visible onClose={onClose} title="This order" description="All optional. A dine-in table usually needs none of it."
      footer={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" onPress={onClose} grow />
          <Btn label="Save" kind="primary" onPress={() => void save()} busy={busy} grow />
        </View>
      )}
    >
      <Eyebrow>Where it is going</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
        {CHANNELS.map((ch) => <Choice key={ch.key} label={ch.label} on={f.channel === ch.key} onPress={() => set({ channel: ch.key })} grow />)}
      </View>

      <Field label="Covers" hint="People eating, not seats">
        <Input label="Covers" value={f.covers} onChangeText={(covers) => set({ covers })} placeholder="-" number />
      </Field>

      {/* POS-4: a list that failed is not a property with nobody to choose. */}
      <Field label="Waiter" hint={waiters.data === undefined && waiters.error
        ? "The list of waiters did not load. The order keeps the waiter it has." : undefined}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
          <Choice label={order.waiter ?? "-"} on={f.waiterId === ""} onPress={() => set({ waiterId: "" })} />
          {(waiters.data ?? []).map((w) => <Choice key={w.id} label={w.name} on={f.waiterId === w.id} onPress={() => set({ waiterId: w.id })} />)}
        </View>
        {waiters.data === undefined && waiters.loading ? <Text style={t.caption}>Reading the waiters…</Text> : null}
      </Field>

      <Eyebrow>Customer</Eyebrow>
      {f.channel === "delivery" && !f.phone.trim() ? (
        /* Said before the bill is cooked; the server refuses at settlement. */
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Phone size={16} color={c.yellow800} />
          <Text style={[t.label, { flex: 1, color: c.yellow800 }]}>A delivery needs a phone number, or it gets cooked and cannot leave the building.</Text>
        </View>
      ) : null}
      <Field label="Mobile"><Input label="Mobile" value={f.phone} onChangeText={(phone) => set({ phone })} placeholder="-" /></Field>
      <Field label="Name"><Input label="Name" value={f.name} onChangeText={(name) => set({ name })} placeholder="-" /></Field>
      {f.channel === "delivery" ? (
        <>
          <Field label="Address"><Input label="Address" value={f.address} onChangeText={(address) => set({ address })} placeholder="-" /></Field>
          <Field label="Locality"><Input label="Locality" value={f.locality} onChangeText={(locality) => set({ locality })} placeholder="-" /></Field>
        </>
      ) : null}

      {order.waiter ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <UserRound size={14} color={c.grey600} />
          <Text style={[t.label, { flex: 1 }]}>Currently {order.waiter}. Leaving the picker alone keeps them.</Text>
        </View>
      ) : null}
      <Refused text={refused} />
    </Sheet>
  );
}
