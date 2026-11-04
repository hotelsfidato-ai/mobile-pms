import { AlarmClock, ChevronRight, ConciergeBell, MessageSquare, PackageSearch, Smartphone, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, t } from "../../core/theme";
import { Head, Screen } from "../../core/ui";
import { Back, Box, IconChip } from "./kit";
import { whyNotDesk, whyNotLost, whyNotRequests, whyNotWakeUps } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   GUEST SERVICES — the phone's one way in to the screens the web lists
   under Front desk (src/modules/guest-services/nav.ts,
   online-checkin/nav.ts), in the menu's order, with each page's own line.
   The web hides an entry a role may not open; the phone shows it grey with
   the API's sentence (AGENTS rule 1). No web twin of its own: the web has
   the menu instead.
   ══════════════════════════════════════════════════════════════════ */

type Entry = { label: string; line: string; path: string; Icon: LucideIcon; why: (role: string | null) => string | null };

const ENTRIES: Entry[] = [
  { label: "Online check-in", line: "What guests sent from their own page, waiting for the desk.", path: "online-checkin", Icon: Smartphone, why: whyNotDesk },
  { label: "Guest requests", line: "What guests in house have asked for, and who is doing it.", path: "requests", Icon: ConciergeBell, why: whyNotRequests },
  { label: "Wake-up calls", line: "Calls to make, on the hotel's clock. Due from fifteen minutes before.", path: "wake-up-calls", Icon: AlarmClock, why: whyNotWakeUps },
  { label: "Lost property", line: "What was found, kept until it goes back to its owner or is disposed of.", path: "lost-property", Icon: PackageSearch, why: whyNotLost },
  { label: "Messages from guests", line: "What guests wrote to the front desk, and the desk's replies.", path: "messages", Icon: MessageSquare, why: whyNotDesk },
];

export function Hub({ hotel, role, onBack, onOpen }: {
  hotel: Hotel; role: string | null; onBack: () => void; onOpen: (path: string) => void;
}) {
  return (
    <Screen refreshing={false} onRefresh={() => undefined}>
      <Head title="Guest services" under={hotel.name} action={<Back onPress={onBack} />} />
      <Box>
        {ENTRIES.map((e, i) => {
          const why = e.why(role);
          return (
            <Pressable
              key={e.path} onPress={() => onOpen(e.path)} disabled={why != null}
              accessibilityRole="button" accessibilityLabel={e.label} accessibilityState={{ disabled: why != null }} accessibilityHint={why ?? e.line}
              style={({ pressed }) => ({
                flexDirection: "row", gap: 14, alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, minHeight: 56,
                borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent",
              })}
            >
              <IconChip Icon={e.Icon} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.label, { color: why ? c.grey500 : c.ink900 }]}>{e.label}</Text>
                <Text style={[t.caption, { color: why ? c.grey600 : c.grey500 }]}>{why ?? e.line}</Text>
              </View>
              {why ? null : <ChevronRight size={16} color={c.grey500} />}
            </Pressable>
          );
        })}
      </Box>
    </Screen>
  );
}
