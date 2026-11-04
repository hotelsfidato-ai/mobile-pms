import { router } from "expo-router";
import * as Lucide from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ON_THE_WEBSITE, activeRoute, hiddenCount, phoneRoute, sidebarFor, spaceOf, spacesFor,
  type MenuIcon, type NavItem, type Role, type Space,
} from "./menu";
import { regular, SCRIM, Slide } from "./Shell";
import { c, face } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   THE MENU BEHIND ☰ — the web's Sidebar and SpaceSwitcher in their phone
   drawer. The lists are src/core/menu.ts's, the web's own. An entry the
   phone has opens its route; the others stay, greyed, with the reason.
   ══════════════════════════════════════════════════════════════════ */

export type Modules = Record<string, boolean>;

/* Sidebar.tsx FOLDED_AS_IT_COMES: only the Front office folds. */
const FOLDED_AS_IT_COMES = new Set([
  "point-of-sale", "banquet", "laundry", "spa", "reports", "system", "sales-marketing", "distribution",
]);

const NAMES: Record<Space, string> = { front: "Front office", pos: "Restaurant", settings: "Settings" };

const white = (a: number) => `rgba(255,255,255,${a})`;

export function ShellMenu({ role, code, modules, path, folded, onFold, onClose }: {
  role: Role; code: string; modules: Modules | undefined; path: string;
  folded: Record<string, boolean>; onFold: (key: string, shownFolded: boolean) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  /* Settings has no phone screen to go to: its pill shows its menu here,
     every entry on the website for now, so the menu is the same overall. */
  const [chosen, setChosen] = useState<Space | null>(null);
  const spaces = spacesFor(role, code, modules);
  const wanted = chosen ?? spaceOf(path);
  const space = spaces.includes(wanted) ? wanted : spaces[0]!;
  const sections = sidebarFor(role, code, modules, space);
  const hidden = hiddenCount(role, code, modules, space);
  /* The one entry lit, the screen in view's own (menu.ts activeRoute). */
  const lit = activeRoute(sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]))
    .flatMap((item) => {
      const route = phoneRoute(item.to, code);
      return route ? [{ route, prefix: item.matchPrefix === true }] : [];
    }), path);

  const go = (route: string) => { onClose(); router.push(route as never); };
  /* Where each space opens (SpaceSwitcher.tsx). */
  const openSpace = (s: Space) => {
    const home = s === "front" ? "/" : s === "pos" ? sidebarFor(role, code, modules, "pos")[0]?.items[0]?.to ?? "/" : null;
    const route = home ? phoneRoute(home, code) : null;
    if (route) go(route); else setChosen(s);
  };

  return (
    <Slide from="left" width={248} scrim={SCRIM} onClose={onClose}>
      <View style={styles.rail}>
        <View style={[styles.brand, { paddingTop: insets.top, height: 56 + insets.top }]}>
          <Text style={{ fontSize: 14.3, color: white(0.95), ...face[600] }}>Fidato Hotels</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 10, gap: 16 }}>
          {spaces.length > 1 ? (
            <View accessibilityLabel="Spaces" style={styles.spaces}>
              {spaces.map((s) => (
                <Pressable
                  key={s} onPress={() => openSpace(s)} accessibilityRole="button" accessibilityState={{ selected: s === space }}
                  style={[styles.space, s === space && { backgroundColor: c.white }]}
                >
                  <Text style={{ fontSize: 12, color: s === space ? c.ink900 : white(0.7), ...face[500] }}>{NAMES[s]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {space === "settings" ? (
            <Row
              item={{ label: "Back to front office", to: "/", icon: "ArrowLeft", resource: "dashboard" }}
              code={code} lit={null} onGo={() => openSpace("front")}
            />
          ) : null}

          {sections.map((section, i) => {
            const key = section.key ?? section.label ?? `section-${i}`;
            /* The section holding the screen in view is never folded. */
            const holds = lit !== null && section.items.some((it) =>
              [it, ...(it.children ?? [])].some((one) => phoneRoute(one.to, code) === lit));
            const asItComes = space === "front" && FOLDED_AS_IT_COMES.has(key);
            const isFolded = !holds && section.label ? (folded[key] ?? asItComes) : false;
            return (
              <View key={key}>
                {section.label ? (
                  <Pressable
                    onPress={() => onFold(key, isFolded)} accessibilityRole="button" accessibilityState={{ expanded: !isFolded }}
                    accessibilityLabel={section.label} style={styles.section} hitSlop={{ top: 10, bottom: 10 }}
                  >
                    <Lucide.ChevronDown size={12} color={white(0.35)} style={isFolded ? { transform: [{ rotate: "-90deg" }] } : undefined} />
                    <Text style={styles.sectionWords}>{section.label}</Text>
                    {isFolded ? <Text style={[styles.sectionWords, { marginLeft: "auto", color: white(0.25) }]}>{section.items.length}</Text> : null}
                  </Pressable>
                ) : null}
                {!isFolded ? (
                  <View style={{ gap: 2 }}>
                    {section.items.map((item) => (
                      <Row key={`${item.label}-${item.to}`} item={item} code={code} lit={lit} onGo={go} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {hidden > 0 ? (
          <View style={[styles.foot, { paddingBottom: 10 + insets.bottom }]}>
            <View
              accessibilityLabel={`Find a screen that is not in your menu. ${ON_THE_WEBSITE}`}
              accessibilityState={{ disabled: true }} style={[styles.row, { gap: 10 }]}
            >
              <Lucide.Search size={16} color={white(0.35)} />
              <View>
                <Text style={{ fontSize: 14, color: white(0.35), ...face[500] }}>Find a screen</Text>
                <Text style={[styles.reason, regular]}>{ON_THE_WEBSITE}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Slide>
  );
}

/** A menu entry (Sidebar.tsx SidebarItem): 44px to a finger, the web's 36 to a mouse. */
function Row({ item, code, lit, onGo }: { item: NavItem; code: string; lit: string | null; onGo: (route: string) => void }) {
  const route = phoneRoute(item.to, code);
  const active = route !== null && route === lit;
  const childActive = item.children?.some((child) => phoneRoute(child.to, code) === lit && lit !== null);
  const groupActive = active || childActive;
  const Icon = Lucide[item.icon as MenuIcon] as Lucide.LucideIcon;
  const colour = !route ? white(0.35) : groupActive ? c.white : white(0.65);
  const why = item.notBuilt ? "Not built yet" : route ? null : ON_THE_WEBSITE;

  return (
    <View>
      <Pressable
        disabled={!route} onPress={() => onGo(route!)} accessibilityRole="button" accessibilityState={{ disabled: !route, selected: groupActive === true }}
        accessibilityLabel={why ? `${item.label}. ${why}` : item.label}
        style={[styles.row, groupActive && { backgroundColor: white(0.1) }]}
      >
        <Icon size={18} color={colour} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, color: colour, ...face[500] }}>{item.label}</Text>
          {why ? <Text style={[styles.reason, regular]}>{why}</Text> : null}
        </View>
        {item.leaves ? <Lucide.ArrowUpRight size={14} color={white(0.4)} /> : null}
      </Pressable>

      {groupActive && item.children?.length ? (
        <View style={styles.children}>
          {item.children.map((child) => {
            const r = phoneRoute(child.to, code);
            const here = r !== null && r === lit;
            return (
              <Pressable
                key={`${child.label}-${child.to}`} disabled={!r} onPress={() => onGo(r!)}
                accessibilityRole="button" accessibilityState={{ disabled: !r, selected: here }}
                accessibilityLabel={r ? child.label : `${child.label}. ${ON_THE_WEBSITE}`}
                style={[styles.child, here && { backgroundColor: white(0.08) }]}
              >
                <Text style={{ fontSize: 14, color: !r ? white(0.35) : here ? c.white : white(0.5), ...regular }}>{child.label}</Text>
                {!r ? <Text style={[styles.reason, regular]}>{ON_THE_WEBSITE}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { flex: 1, backgroundColor: c.ink900 },
  brand: { justifyContent: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: white(0.08) },
  spaces: { flexDirection: "row", padding: 2, borderRadius: 999, backgroundColor: white(0.08) },
  space: { flex: 1, height: 44, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  section: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 24, paddingHorizontal: 10, marginBottom: 6 },
  sectionWords: { fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: white(0.35), ...face[600] },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  reason: { fontSize: 12, lineHeight: 17, color: white(0.45) },
  children: { marginTop: 2, marginBottom: 4, marginLeft: 19, paddingLeft: 12, gap: 2, borderLeftWidth: 1, borderLeftColor: white(0.1) },
  child: { justifyContent: "center", minHeight: 44, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  foot: { borderTopWidth: 1, borderTopColor: white(0.08), paddingHorizontal: 10, paddingTop: 10 },
});
