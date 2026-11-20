import { useState } from "react";
import { Platform, Pressable, Switch, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { useSession } from "../../core/session";
import { c, face, space, t } from "../../core/theme";
import { Card, Head, Screen, ripple, shade, useRead } from "../../core/ui";
import { readGroupReport } from "./opsData";
import { exportOf, monthWords, plusMonths } from "./opsDoc";
import { DocView, Kept, NotRead, NotYours, Quiet, Reading } from "./OpsDocView";
import {
  GROUP_REPORTS, earliestOf, groupAsk, groupPeriod, hotelsWhere, mayOpenGroup, readsMoney, readsReports, type GroupReportKey,
} from "./opsGroup";
import { notYourRole } from "./opsIndex";
import { DayStep } from "./OpsReport";

/* ══════════════════════════════════════════════════════════════════
   GROUP REPORTS on a phone — the web's /group-reports (src/modules/reports/
   pages/GroupReports.tsx, the 16 Nov release; not pictured): the main
   reports for several properties at once, each property's line and a total,
   both the server's (api/src/modules/reports/group.ts adds like with like,
   and its footnotes say what was not added, and why). Only the properties
   the person may read that report at are offered; the server asks again at
   every one, and a refusal is shown in its own words, naming the property.
   Opened from the property in view (/reports/<code>/group-reports).
   ══════════════════════════════════════════════════════════════════ */

export function GroupReports({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const s = useSession();
  const who = s.who!;
  const [key, setKey] = useState<GroupReportKey>("manager");
  const report = GROUP_REPORTS.find((x) => x.key === key)!;
  const hotels = hotelsWhere(who, report.money ? readsMoney : readsReports);
  /* Every property offered, until the person turns one off. */
  const [left, setLeft] = useState<string[]>([]);
  const chosen = hotels.filter((h) => !left.includes(h.code));
  const codes = chosen.map((h) => h.code);
  const earliest = earliestOf(chosen);
  const [asOn, setAsOn] = useState("");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const day = asOn || earliest;
  const query = groupAsk(report, day, month, from);
  const period = day ? groupPeriod(report, query, day) : "";
  const open = mayOpenGroup(who, role);
  const ask = open && codes.length > 0 && Boolean(day);
  const [pulled, setPulled] = useState(false);
  const read = useRead(() => (ask ? readGroupReport(key, codes, query) : Promise.resolve(null)), ["reports", hotel.code, "group", key, codes, query]);
  const reload = () => { setPulled(true); read.reload(); };
  const doc = ask ? read.data : undefined;

  if (!open) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <Head title="Group reports" />
        <NotYours sentence={notYourRole(role, "Group reports")} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={pulled && read.loading} onRefresh={reload}>
      <Head title="Group reports" under={period || undefined} />
      <ExportButtons table={doc ? exportOf(doc, period) : null} />

      {/* The report's own settings, above it and never printed (ReportShell's controls). */}
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Report">
          <Text style={[t.label, { color: c.grey700 }]}>Report</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GROUP_REPORTS.map((x) => {
              const on = x.key === key;
              return (
                <Pressable
                  key={x.key} onPress={() => setKey(x.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.title}
                  android_ripple={ripple}
                  style={shade(({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, justifyContent: "center", overflow: "hidden",
                    borderColor: on ? c.ink900 : c.grey300, backgroundColor: on ? c.ink900 : pressed ? c.grey100 : c.white }))}
                >
                  <Text style={[t.label, face[500], { color: on ? c.white : c.grey700 }]}>{x.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!day ? null : report.asks === "month" ? (
          <DayStep label="Month" value={query.month!} max={earliest.slice(0, 7)} onChange={setMonth} words={monthWords} step={plusMonths} />
        ) : (
          <>
            {report.asks === "range" ? <DayStep label="From" value={query.from!} max={day} onChange={setFrom} /> : null}
            <DayStep label={report.asks === "range" ? "To" : "As on"} value={day} max={earliest} onChange={setAsOn} />
          </>
        )}

        <View style={{ gap: 4 }}>
          <Text style={[t.label, face[500], { color: c.ink900 }]}>Properties</Text>
          {hotels.map((h) => {
            const on = !left.includes(h.code);
            return (
              <View key={h.code} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48 }}>
                <Text style={[t.label, { color: c.ink900, flex: 1 }]}>{h.name}</Text>
                <Switch
                  value={on} accessibilityLabel={h.name}
                  onValueChange={(v) => setLeft((l) => (v ? l.filter((x) => x !== h.code) : [...l, h.code]))}
                  trackColor={{ false: c.grey300, true: c.orange }} thumbColor={Platform.OS === "android" ? c.white : undefined} ios_backgroundColor={c.grey300}
                />
              </View>
            );
          })}
        </View>
      </Card>

      {hotels.length === 0 ? (
        <Quiet text="You read this report at no property, so there is nothing to add up." />
      ) : codes.length === 0 ? (
        <Quiet text="Turn on at least one property." />
      ) : doc === undefined ? (
        read.error ? <NotRead what="the group report" error={read.error} onRetry={reload} /> : <Reading what="the group report" />
      ) : doc === null ? null : (
        <View style={{ gap: space.card }}>
          <Kept error={read.error} what="the group report" />
          {/* Of several real hotels: never marked as a test hotel's (ReportShell `group`). */}
          <DocView doc={doc} period={period} ranBy={who.scope.fullName} test={false} />
        </View>
      )}
    </Screen>
  );
}
