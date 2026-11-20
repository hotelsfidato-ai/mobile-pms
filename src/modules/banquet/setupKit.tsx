import { X, type LucideIcon } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { confirmAct, modalEdge, notKnown, ripple, shade, useSheetPad, useStuck } from "../../core/ui";
import { Foot, IconChip, InDialog, message, saidOf, type Said } from "../guest-services/kit";

/* ══════════════════════════════════════════════════════════════════
   THE SET-UP SCREENS' FEW SHARED PIECES (lane U, 19 Nov): Halls and
   packages, Treatments and therapists, the Laundry price list and Who may
   ask to buy. The web's Card + CardHeader (an IconChip, the heading, its
   note, the card's action), and the two ways a set-up write is made:

   - FROM A DIALOG (add, edit): latched at the tap (MEMORY 8); the server's
     no shown inside the dialog, which stays open; an UNKNOWN outcome
     (core/api.ts outcomeUnknown: nothing came back, a 5xx, or the phone's
     own refusal once the line dropped) sticks the dialog - no more taps
     until it is closed and the list read again (MEMORY 16, core useStuck).
     None of these routes reads an idempotency key.
   - FROM A ROW (a switch, a price, take off / put back): one write per row
     at a time; it sets a value, so a repeat sets the same; an unknown
     outcome is said ("Not known whether it was …") and the list is read
     again at once, so what the person sees next is the record.

   A destructive act (retire, take off, switch off) asks first (askFirst:
   each phone's own Alert, docs/NATIVE.md), in the web's own words for what
   it does. The dialog is the web's, centred, inside the safe area, lifted
   over the keyboard, Android's back closing it (docs/NATIVE.md).
   ══════════════════════════════════════════════════════════════════ */

/** The web's Button, each phone's own press: Android's ripple, iPhone's pressed shade (docs/NATIVE.md). */
export function Btn({ label, a11y, variant = "secondary", icon: Icon, onPress, disabled, tall, grow, hint }: {
  label: string; a11y?: string; variant?: "primary" | "secondary" | "danger"; icon?: LucideIcon;
  onPress: () => void; disabled?: boolean; tall?: boolean; grow?: boolean; hint?: string | null;
}) {
  const solid = variant !== "secondary";
  const fg = disabled ? (solid ? c.grey600 : c.grey500) : solid ? c.white : c.ink900;
  const rest = { primary: c.orange600, secondary: c.white, danger: c.red700 }[variant];
  const down = { primary: c.orange700, secondary: c.grey100, danger: "#a82115" }[variant];
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }} accessibilityHint={hint ?? undefined}
      android_ripple={ripple}
      style={shade(({ pressed }) => ({
        minHeight: tall ? 48 : 44, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", gap: 8, overflow: "hidden",
        alignItems: "center", justifyContent: "center", ...(grow ? { flex: 1 } : null),
        backgroundColor: disabled ? (solid ? c.grey300 : c.grey50) : pressed ? down : rest,
        borderWidth: solid ? 0 : 1, borderColor: c.grey300,
      }))}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** The web's CardHeader: chip, heading, a grey note under it, the card's action on the right. */
export function CardHead({ Icon, title, note, action, extra }: {
  Icon: LucideIcon; title: string; note?: string | null; action?: ReactNode; extra?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
      <View style={{ flex: 1, minWidth: 150, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconChip Icon={Icon} />
          <Text style={t.heading} accessibilityRole="header">{title}</Text>
          {extra}
        </View>
        {note ? <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>{note}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** A list row, 56 or more, a hairline above all but the first (the web's divide-y). */
export const ListRow = ({ first, children }: { first: boolean; children: ReactNode }) => (
  <View style={{ minHeight: 56, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
    {children}
  </View>
);

/** One write from a dialog. `refused`: the title over the server's own no ("Not saved"). */
export function useDialogWrite(refused: string, done: string, where: string) {
  const latch = useRef(false);
  const stuck = useStuck();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const run = async (write: () => Promise<unknown>, onDone: () => void) => {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await write();
      onDone();
    } catch (e) {
      if (stuck.stop(e)) {
        const n = notKnown(done, where, e);
        setSaid({ title: n.title, body: `${n.body} Close this; the list is read again.`, tone: "bad" });
      } else setSaid(saidOf(refused, e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  };
  return { busy, said, run, stuck: stuck.stuck };
}

/** One write per row at a time; `going` greys that row's control while it is on its way. */
export function useRowWrite(say: (s: Said) => void, reread: () => void) {
  const going = useRef(new Set<string>());
  const [busy, setBusy] = useState<readonly string[]>([]);
  const run = async (id: string, write: () => Promise<unknown>, words: { ok?: string; refused: string; done: string; where: string }) => {
    if (going.current.has(id)) return;
    going.current.add(id);
    setBusy([...going.current]);
    try {
      await write();
      if (words.ok) say({ title: words.ok, tone: "ok" });
      reread();
    } catch (e) {
      if (outcomeUnknown(e)) {
        const n = notKnown(words.done, words.where, e);
        say({ title: n.title, body: `${message(e)} The list is read again: look at it before trying again.`, tone: "bad" });
        reread();
      } else say(saidOf(words.refused, e));
    } finally {
      going.current.delete(id);
      setBusy([...going.current]);
    }
  };
  return { run, busy: (id: string) => busy.includes(id) };
}

/** Asks before a destructive act, in each phone's own dialog: the question, what it does, the act's word. */
export const askFirst = (title: string, body: string, yes: string, onYes: () => void) => confirmAct(title, body, yes, onYes);

/** The web's Dialog: centred, 16 from each side and inside the safe area, a hairline under its head. */
export function Dialog({ title, description, onClose, children }: {
  title: string; description?: string; onClose: () => void; children: ReactNode;
}) {
  const pad = useSheetPad();
  const { height } = useWindowDimensions();
  return (
    <Modal {...modalEdge} visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.25)", justifyContent: "center", paddingHorizontal: 16, paddingTop: pad.top, paddingBottom: pad.bottom }}
      >
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, maxHeight: height - pad.top - pad.bottom - 32 }}>
          <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ flex: 1 }}>
              <Text style={t.heading} accessibilityRole="header">{title}</Text>
              {description ? <Text style={[t.label, { color: c.grey500, marginTop: 4 }]}>{description}</Text> : null}
            </View>
            <Pressable
              onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}
              android_ripple={{ ...ripple, borderless: true }}
              style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} color={c.grey500} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The dialog's foot: Cancel, and the act (greyed while on its way, stuck, or not ready). */
export function DialogFoot({ act, busyWord, ready, w, onClose, onAct }: {
  act: string; busyWord: string; ready: boolean; w: { busy: boolean; stuck: boolean; said: Said | null }; onClose: () => void; onAct: () => void;
}) {
  return (
    <>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={w.busy ? busyWord : act} variant="primary" tall grow disabled={w.busy || w.stuck || !ready} onPress={onAct} />
      </Foot>
    </>
  );
}

/** A greyed control's sentence, once (AGENTS rule 1). */
export const Why = ({ text }: { text: string | null }) =>
  text ? <Text style={[t.caption, { color: c.grey600 }]}>{text}</Text> : null;
