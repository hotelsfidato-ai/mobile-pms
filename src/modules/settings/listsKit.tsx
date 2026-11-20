import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { mayReach, type Role } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, ripple, shade } from "../../core/ui";
import { Field, Refused, Toast, body, type Said } from "../admin/kit";
import { notYourRole } from "../admin/roles";
import { whyNot, SETUP_CHANGE } from "../inventory/configRoles";
import { doubts, stillUnknown, typedColour, COLOUR_WRONG, NO_COLOUR } from "./lists";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES THE LISTS AND FRONT DESK PAGES SHARE (lane m13-set-lists)

   - the page: the console's guard (mayReach, the web's mayReach of the
     page's address) and RequireAccess's sentence, the title, the web's
     plain-words panel (Explain) under it, pull down to read again, the
     toast over it;
   - one write at a time, and the unknown outcome (MEMORY 16, 22): while a
     write is on its way the page sends nothing else and its sheet cannot
     close; when nothing came back or the server failed, the page's writes
     stay grey until a read BEGUN after the loss has come back - the doubt
     is kept outside React (lists.ts `doubts`), by hotel and page;
   - a colour, typed (the phone has no colour box), with its swatch.
   ══════════════════════════════════════════════════════════════════ */

/** The API's sentence when this role may not change the set-up (SETUP_CHANGE), else null. */
export const whyNotChange = (role: Role) => whyNot(SETUP_CHANGE, role);

/** A console page: refused with RequireAccess's words when the web would not open it for this role. */
export function Page({ role, address, title, eyebrow, explain, action, refreshing, onRefresh, said, onSaidClose, children }: {
  role: Role; address: string; title: string; eyebrow: string; explain?: string; action?: ReactNode;
  refreshing: boolean; onRefresh: () => void; said: Said | null; onSaidClose: () => void; children: ReactNode;
}) {
  const refused = mayReach(role, address) ? null : notYourRole(role, title);
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <Head eyebrow={eyebrow} title={title} under={explain} action={refused ? undefined : action} />
        {refused ? <Refused sentence={refused} /> : children}
      </Screen>
      <Toast said={said} onClose={onSaidClose} />
    </View>
  );
}

type On<T> = { ok: (r: T) => void; no: (e: unknown) => void; unknown: (e: unknown) => void };

/** One write at a time on a page, and its doubts. `began`: for each doubt key the page holds, when the
    read that answers it BEGAN. `stuck` while any of them is unknown; `run(key, …)` writes under one. */
export function usePageWrite(began: Readonly<Record<string, number | undefined>>) {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const [, redraw] = useState(0);
  const keys = Object.keys(began);
  const stuck = keys.some((k) => stillUnknown(doubts.at(k), began[k]));
  /* A doubt whose answer has been read again goes; the page redraws without it. */
  const settleable = keys.filter((k) => doubts.at(k) !== null && !stillUnknown(doubts.at(k), began[k])).join("|");
  useEffect(() => {
    if (!settleable) return;
    if (settleable.split("|").map((k) => doubts.settle(k, began[k])).some(Boolean)) redraw((n) => n + 1);
  }, [settleable, began]);
  async function run<T>(key: string, fn: () => Promise<T>, on: On<T>): Promise<void> {
    if (latch.current || stuck) return;
    latch.current = true;
    setBusy(true);
    try {
      on.ok(await fn());
    } catch (e) {
      if (outcomeUnknown(e)) { doubts.lost(key, Date.now()); redraw((n) => n + 1); on.unknown(e); } else on.no(e);
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  return { busy, stuck, blocked: busy || stuck, run };
}

/** A colour's square, as the web's swatch (size-4 rounded, or the colour box's size-7). */
export function Swatch({ colour, size = 16 }: { colour: string | null; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 4, borderWidth: 1, borderColor: c.grey200, backgroundColor: colour ?? NO_COLOUR }} />;
}

/** A colour typed as #RRGGBB, its square beside it; the server's sentence when it is not one. */
export function ColourField({ label, value, onChangeText, editable = true }: {
  label: string; value: string; onChangeText: (v: string) => void; editable?: boolean;
}) {
  const ok = typedColour(value);
  return (
    <Field label={label} value={value} onChangeText={onChangeText} editable={editable} maxLength={7} placeholder="#DF6128"
      input={{ autoCapitalize: "characters", autoCorrect: false, autoComplete: "off" }}
      hint="Typed as #RRGGBB: the phone has no colour box." error={value.trim() && !ok ? COLOUR_WRONG : undefined}
      right={<View style={{ height: 44, justifyContent: "center" }}><Swatch colour={ok} size={28} /></View>} />
  );
}

/** A small square button with an icon and its words for a reader (44 × 44). */
export function IconBtn({ icon, label, onPress, disabled }: { icon: ReactNode; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }} android_ripple={{ ...ripple, borderless: true }}
      style={shade(({ pressed }) => ({ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : 1, backgroundColor: pressed ? c.grey100 : "transparent" }))}
    >
      {icon}
    </Pressable>
  );
}

/** A card with the web's Section heading and sentence (FrontDeskPage Section). */
export function Section({ title, why, children }: { title: string; why?: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {why ? <Text style={[body, { color: c.grey600 }]}>{why}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A line under a control: why it is grey (the API's sentence), or that the last change is not known. */
export function Why({ text, tone = "grey" }: { text: string | null | undefined; tone?: "grey" | "red" }) {
  if (!text) return null;
  return <Text style={[t.caption, { lineHeight: 17, color: tone === "red" ? c.red700 : c.grey500, ...face[500] }]}>{text}</Text>;
}
