import {
  AlertTriangle, ClipboardList, IndianRupee, PackageX, Trash2, TrendingDown, TrendingUp, Truck, type LucideIcon,
} from "lucide-react-native";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ROLE_LABELS, asRole } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Box, Empty, type Said } from "../guest-services/kit";
import { TILES, type Tile } from "./shelf";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES THE STORE NEEDS THAT THE GUEST-SERVICES KIT (imported,
   never edited) does not carry, ported from the web with its tokens:
   StoreTiles.tsx, the kit's Menu (More), a group heading's count pill
   (Rooms' D27-82), RequireAccess's "not part of your role".
   ══════════════════════════════════════════════════════════════════ */

const ICON: Record<Tile, LucideIcon> = {
  below: AlertTriangle, runOut: PackageX, received: TrendingUp, issued: TrendingDown,
  wasted: Trash2, awaiting: Truck, notValued: IndianRupee, notCounted: ClipboardList,
};

/** The tiles across the top (StoreTiles.tsx): a count over its label; the
    chosen one navy; one with a job warm while it has any; a tap filters,
    a second clears. On a phone the row scrolls inside itself. */
export function Tiles({ counts, picked, onPick }: { counts: Record<Tile, number>; picked: Tile | null; onPick: (t: Tile | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -space.side }}
      contentContainerStyle={{ paddingHorizontal: space.side, gap: 8 }} accessibilityLabel="Filter the store">
      {TILES.map(({ key, label, job }) => {
        const n = counts[key];
        const on = picked === key;
        const warm = !on && job && n > 0;
        const Icon = ICON[key];
        return (
          <Pressable
            key={key} onPress={() => onPick(on ? null : key)} accessibilityRole="button"
            accessibilityLabel={`${label}: ${n}`} accessibilityState={{ selected: on }}
            style={{
              minWidth: 132, minHeight: 64, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4,
              backgroundColor: on ? c.ink900 : warm ? c.yellow50 : c.white,
              borderColor: on ? c.ink900 : warm ? c.yellow100 : c.grey200,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center",
                backgroundColor: on ? c.navyTrack : warm ? c.yellow100 : c.grey100,
              }}>
                <Icon size={14} color={on ? c.white : warm ? c.yellow800 : c.grey600} />
              </View>
              <Text style={[t.figure, { lineHeight: 24, color: on ? c.white : c.ink900 }]}>{String(n)}</Text>
            </View>
            <Text style={[t.label, { lineHeight: 18, color: on ? c.onNavy : c.grey600 }]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A group's heading and its flat count pill (Rooms' group headings, D27-82). */
export function GroupHead({ title, n }: { title: string; n?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
      <Text style={t.heading} accessibilityRole="header">{title}</Text>
      {n === undefined ? null : (
        <View style={{ height: 20, paddingHorizontal: 8, borderRadius: 999, backgroundColor: c.grey100, justifyContent: "center" }}>
          <Text style={{ fontSize: 12, color: c.grey600, ...face[600], ...t.tab }}>{String(n)}</Text>
        </View>
      )}
    </View>
  );
}

/* iOS shows no second Modal while the first is still fading out: a dialog
   opened from the sheet waits for the sheet to go. */
const later = (f: () => void) => (Platform.OS === "ios" ? setTimeout(f, 350) : f());

export interface MenuChoice { label: string; icon: LucideIcon; onPress: () => void; reason?: string | null; gap?: boolean }

/** The web kit's Menu at the foot of the screen: each act with its word; a
    grey one says why, under it (the web's `reason`). */
export function ActionSheet({ title, choices, onClose }: { title: string; choices: MenuChoice[]; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 24, gap: 4 }}>
          <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">{title}</Text>
          {choices.map((m) => {
            const off = m.reason != null;
            return (
              <Pressable
                key={m.label} disabled={off} onPress={() => { onClose(); later(m.onPress); }}
                accessibilityRole="button" accessibilityLabel={off ? `${m.label}: ${m.reason}` : m.label} accessibilityState={{ disabled: off }}
                style={({ pressed }) => ({
                  minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8,
                  borderTopWidth: 1, borderTopColor: m.gap ? c.grey200 : c.grey100, backgroundColor: pressed ? c.grey50 : c.white,
                })}
              >
                <m.icon size={16} color={off ? c.grey400 : c.grey600} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.label, { color: off ? c.grey500 : c.ink900 }]}>{m.label}</Text>
                  {off ? <Text style={[t.caption, { color: c.grey500 }]}>{m.reason}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

/** RequireAccess's page (src/components/app/RequireAccess.tsx), as the picture
    n-pos-kitchen-stock shows it for a role the menu does not give the screen. */
export function NotYourRole({ role, screen }: { role: string | null; screen: string }) {
  const name = role ? ROLE_LABELS[asRole(role)] : "nobody here";
  return (
    <Box>
      <Empty
        compact title="This page is not part of your role"
        description={`You are signed in as ${name}, which does not include ${screen}. If you need it, the person who set up your account can change your role.`}
      />
    </Box>
  );
}

/** A figure under its one-line label (the item card's On hand, Worth). */
export function Figure({ label, value, unit, under, grey }: { label: string; value: string; unit?: string | null; under?: string | null; grey?: boolean }) {
  return (
    <View style={{ gap: 2, minWidth: 96 }}>
      <Text style={[t.label, { color: c.grey500 }]}>{label}</Text>
      <Text style={[t.figure, { color: grey ? c.grey500 : c.ink900 }]}>
        {value}{unit ? <Text style={[t.label, { color: c.grey500 }]}>{` ${unit}`}</Text> : null}
      </Text>
      {under ? <Text style={[t.caption, t.tab]}>{under}</Text> : null}
    </View>
  );
}

/** A write whose outcome is unknown (`outcomeUnknown`: nothing came back, or a 5xx) on a route that
    reads no key (PMS R-30): said plainly, and the dialog takes no more taps until it is closed and
    the stock read again (MEMORY 16). */
export const unknownSaid = (title: string, e: unknown): Said => ({
  title: title.replace(/^Not /, "Not known whether it was "),
  body: `${e instanceof Error ? e.message : String(e)} Close this and look at the stock again before trying again.`,
  tone: "bad",
});

