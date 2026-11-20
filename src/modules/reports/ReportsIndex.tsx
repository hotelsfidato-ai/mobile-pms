import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowLeftRight, ArrowRight, Ban, Boxes, Building2, CalendarDays, ChartColumn, ChartNoAxesColumn, ClipboardCheck,
  ClipboardList, Clock, FileJson, FileSpreadsheet, FileText, Gauge, HandCoins, Hourglass, Landmark, PackageOpen,
  Percent, PiggyBank, Plane, ReceiptText, Refrigerator, ScrollText, Search, ShoppingCart, Star, Trash2, Truck, UserX,
  Wallet, Wine, type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Hotel } from "../../core/api";
import { asRole } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Card, Head, Screen, ripple, shade } from "../../core/ui";
import { IconChip } from "./kit";
import { keepStars, readModules, readStars } from "./opsData";
import { NotYours } from "./OpsDocView";
import {
  BUILT, PAGES, TOTAL, notYourRole, phoneHref, shownGroups, starredRows, toggled, type ReportIcon, type ReportLink,
} from "./opsIndex";

/* ══════════════════════════════════════════════════════════════════
   ALL REPORTS on a phone — the web's /reports (src/modules/reports/pages/
   Index.tsx; picture pms-shots/all/50-reports-all-reports, the GM on 31
   Oct, 29 reports then; today's page has 37). Grouped as a manager thinks
   of them, each row offered only to whom its menu entry is (opsIndex.ts),
   the search over titles and descriptions, the stars kept on the phone.
   A row opens the phone's own report, /reports/<code>/<name>: this lane
   builds the day's and No show; the other report lanes the rest.
   ══════════════════════════════════════════════════════════════════ */

const ICONS: Record<ReportIcon, LucideIcon> = {
  ClipboardList, ScrollText, Ban, ChartColumn, CalendarDays, ChartNoAxesColumn, Building2, Clock, FileText, Percent,
  UserX, ReceiptText, Wallet, HandCoins, Landmark, FileSpreadsheet, FileJson, ShoppingCart, PiggyBank, Plane, Boxes,
  ArrowLeftRight, PackageOpen, Trash2, ClipboardCheck, Hourglass, Gauge, Truck, Refrigerator, Wine,
};

const DESCRIPTION = "Taken from real exports out of the live system, so the columns and the totals match what is being read today.";

export function ReportsIndex({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const r = asRole(role);
  const [search, setSearch] = useState("");
  const [stars, setStars] = useState<string[]>([]);
  useEffect(() => { void readStars().then(setStars); }, []);
  /* The shell's own read of the switches, under its own key: the menu and this page agree. */
  const modules = useQuery({ queryKey: ["modules", code], enabled: Boolean(code), staleTime: 5 * 60_000, queryFn: () => readModules(code) });

  if (!PAGES.index.may(r)) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <Head title="All reports" />
        <NotYours sentence={notYourRole(role, PAGES.index.menu)} />
      </Screen>
    );
  }

  const toggle = (path: string) => setStars((now) => { const next = toggled(now, path); void keepStars(next); return next; });
  const groups = shownGroups(r, search, modules.data);
  const starred = starredRows(r, stars, search, modules.data);
  const card = (x: ReportLink) => (
    <ReportCard key={x.path} report={x} starred={stars.includes(x.path)} onToggle={() => toggle(x.path)} onOpen={() => router.push(phoneHref(x.path, code) as never)} />
  );

  return (
    <Screen refreshing={false} onRefresh={() => void modules.refetch()}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Text style={t.title} accessibilityRole="header">All reports</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.grey100 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.grey400 }} />
          <Text style={[t.caption, t.tab, { color: c.grey600, fontSize: 13 }]}>{`${BUILT} of ${TOTAL} built`}</Text>
        </View>
      </View>
      <Text style={[t.label, { color: c.grey500, lineHeight: 21, marginTop: -6 }]}>{DESCRIPTION}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, paddingHorizontal: 12, marginTop: 4 }}>
        <Search size={18} color={c.grey400} />
        <TextInput
          value={search} onChangeText={setSearch} placeholder="Find a report" placeholderTextColor={c.grey400}
          accessibilityLabel="Find a report" autoCorrect={false} autoCapitalize="none" returnKeyType="search" clearButtonMode="while-editing"
          style={[t.label, { flex: 1, color: c.ink900, paddingVertical: 10 }]}
        />
      </View>

      {starred.length > 0 ? (
        <View style={{ gap: space.card, marginTop: 8 }}>
          <Text style={t.heading} accessibilityRole="header">Starred</Text>
          {starred.map(card)}
        </View>
      ) : null}

      {groups.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 6, paddingVertical: 28 }}>
          <Search size={22} color={c.grey400} />
          <Text style={[t.heading, { textAlign: "center" }]}>No report matches that</Text>
          <Text style={[t.label, { textAlign: "center", color: c.grey500 }]}>Try the name of a column instead — the descriptions carry them.</Text>
        </Card>
      ) : groups.map((g) => (
        <View key={g.title} style={{ gap: space.card, marginTop: 12 }}>
          <View style={{ gap: 2 }}>
            <Text style={t.heading} accessibilityRole="header">{g.title}</Text>
            <Text style={[t.label, { color: c.grey500 }]}>{g.note}</Text>
          </View>
          {g.reports.map(card)}
        </View>
      ))}
    </Screen>
  );
}

/** Index.tsx ReportCard: its glyph and title, a star, the description, "Open". */
function ReportCard({ report, starred, onToggle, onOpen }: { report: ReportLink; starred: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <Pressable
      onPress={onOpen} accessibilityRole="button" accessibilityLabel={report.title} accessibilityHint={`Opens ${report.title}`}
      android_ripple={ripple}
      style={shade(({ pressed }) => [{ backgroundColor: pressed ? c.grey50 : c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200,
        paddingHorizontal: space.cardX, paddingVertical: space.cardY, overflow: "hidden", gap: 6 }])}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconChip icon={ICONS[report.icon]} />
        <Text style={[t.heading, { flex: 1 }]}>{report.title}</Text>
        <Pressable
          onPress={onToggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={starred ? `Unstar ${report.title}` : `Star ${report.title}`}
          accessibilityState={{ selected: starred }} android_ripple={{ ...ripple, borderless: true }}
          style={{ width: 44, height: 44, marginRight: -10, marginVertical: -8, alignItems: "center", justifyContent: "center" }}
        >
          <Star size={18} color={starred ? c.yellow : c.grey400} fill={starred ? c.yellow : "none"} />
        </Pressable>
      </View>
      <Text style={[t.label, { lineHeight: 22 }]}>{report.description}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 }}>
        <Text style={[t.label, face[500], { color: c.orange700 }]}>Open</Text>
        <ArrowRight size={14} color={c.orange700} />
      </View>
    </Pressable>
  );
}
