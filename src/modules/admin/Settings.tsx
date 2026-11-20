import { router } from "expo-router";
import * as Lucide from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { ON_THE_WEBSITE, phoneRoute, sidebarFor, type MenuIcon, type NavItem } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, s as core, ripple, shade } from "../../core/ui";
import { Refused } from "./kit";
import { refusedScreen } from "./roles";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   THE SETTINGS CONSOLE on a phone — the web's /settings (pages/
   Settings.tsx and the registry src/components/app/settingsConsole.ts,
   D27-249, D27-256): its nine groups and their pages, each drawn only
   where it holds something for this person, in the console's order. The
   list is the core's port of the console (menu.ts sidebarFor(…,
   "settings"), the same one the frame's Settings space draws), so a page
   is offered here exactly when the web offers it.

   A page the phone has opens; one it has not yet is shown greyed, "On the
   website for now" (never hidden). A page that is a Front office screen
   (↗ on the web) says so. The web opens straight on the first page
   (Profile); a phone has no sidebar beside it, so this list is the
   console's first screen. Not pictured (new/n-settings failed to capture;
   the pictures 67 and 70 show the Profile page it opens on).
   ══════════════════════════════════════════════════════════════════ */

export function Settings({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedScreen(role, "settings");
  const sections = refused ? [] : sidebarFor(role, code, undefined, "settings");
  return (
    <Screen refreshing={false} onRefresh={() => undefined}>
      <Head eyebrow={hotel.name} title="Settings" under="How this property is set up to run." />
      {refused ? <Refused sentence={refused} /> : sections.map((section) => (
        <View key={section.key ?? section.label} style={{ gap: 8 }}>
          <Text style={t.eyebrow} accessibilityRole="header">{section.label}</Text>
          <View style={[core.card, { paddingVertical: 4, paddingHorizontal: 0 }]}>
            {section.items.map((item, i) => <Entry key={item.to} item={item} code={code} first={i === 0} />)}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function Entry({ item, code, first }: { item: NavItem; code: string; first: boolean }) {
  const route = phoneRoute(item.to, code);
  const Icon = (Lucide[item.icon as MenuIcon] ?? Lucide.Circle) as Lucide.LucideIcon;
  const on = route !== null;
  return (
    <Pressable
      onPress={on ? () => router.push(route as never) : undefined} disabled={!on}
      accessibilityRole={on ? "link" : "text"} accessibilityState={{ disabled: !on }}
      accessibilityLabel={on ? item.label : `${item.label}. ${ON_THE_WEBSITE}`}
      android_ripple={on ? ripple : undefined}
      style={shade(({ pressed }) => ({
        minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX,
        borderTopWidth: first ? 0 : 1, borderColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent",
      }))}
    >
      {/* The menu's glyph in a 28px chip (the web's link rows, D27-220). */}
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: on ? c.orange50 : c.grey100, alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={on ? c.orange700 : c.grey400} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: on ? c.ink900 : c.grey500, ...face[500] }]}>{item.label}</Text>
        {!on ? <Text style={t.caption}>{ON_THE_WEBSITE}</Text> : item.leaves ? <Text style={t.caption}>In the front office</Text> : null}
      </View>
      {on ? (item.leaves ? <Lucide.ArrowUpRight size={16} color={c.grey400} /> : <Lucide.ChevronRight size={16} color={c.grey400} />) : null}
    </Pressable>
  );
}
