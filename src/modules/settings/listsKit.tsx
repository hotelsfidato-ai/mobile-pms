import { useSyncExternalStore, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ApiError, outcomeUnknown } from "../../core/api";
import { settleMs, stops } from "../../core/stop";
import { mayReach, type Role } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, ripple, shade } from "../../core/ui";
import { Field, Refused, Toast, body, type Said } from "../admin/kit";
import { notYourRole } from "../admin/roles";
import { whyNot, SETUP_CHANGE } from "../inventory/configRoles";
import { COLOUR_WRONG, NO_COLOUR, freshName, pageSending, pageStuck, pageUnknown, typedColour, watchPage, writeOnce } from "./lists";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES THE LISTS AND FRONT DESK PAGES SHARE (lane m13-set-lists)

   - the page: the console's guard (mayReach, the web's mayReach of the
     page's address) and RequireAccess's sentence, the title, the web's
     plain-words panel (Explain) under it, pull down to read again, the
     toast over it;
   - one write at a time, and the unknown outcome (MEMORY 16, 22): while a
     write is on its way the page sends nothing else and its sheet cannot
     close; when nothing came back or the server failed, the page's writes
     stay grey until a read BEGUN after the loss has come back; and after a
     write that landed, until the page has read it again (MSET-L1). All of
     it is the core's stop book (src/core/stop.ts), outside React, by name
     (lists.ts pageName), so leaving and coming back mid-write lets nothing go;
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

/** One write at a time on a page, by the core's stop book. `names`: the page's names in it (lists.ts
    pageName; fixed for the page). A read is wrapped with `watch(name, read)`; a write goes through
    `run(name, write, on)`. */
export function usePageWrite(names: readonly string[]) {
  /* Redrawn whenever the book changes (any page's): the page reads its own state from it. */
  const snap = () => names.map((n) => `${stops.stuck(n) ? 1 : 0}${stops.unknown(n) ? 1 : 0}${stops.stuck(freshName(n)) ? 1 : 0}`).join(",");
  useSyncExternalStore(stops.subscribe, snap);
  const stuck = pageStuck(stops, names);
  const busy = pageSending(stops, names);
  return {
    /** A write on its way: "Saving…", and its sheet cannot close. */
    busy,
    /** Lost: the "not known" line. */
    unknown: pageUnknown(stops, names),
    /** Every control grey: on its way, lost, or landed and not yet read again. */
    blocked: stuck,
    watch: <T,>(name: string, read: (ctx?: { signal?: AbortSignal }) => Promise<T>) => watchPage(stops, name, read),
    run: async <T,>(name: string, write: () => Promise<T>, on: On<T>): Promise<void> => {
      const got = await writeOnce(stops, names, name, write, (e) => (outcomeUnknown(e) ? settleMs(e instanceof ApiError ? e.status : 0) : null));
      if (got.kind === "ok") on.ok(got.r);
      else if (got.kind === "no") on.no(got.e);
      else if (got.kind === "unknown") on.unknown(got.e);
    },
  };
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
