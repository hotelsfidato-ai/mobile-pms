import { Activity as Pulse, AlertTriangle, Database, HardDrive, Plug, Server as ServerIcon, ShieldCheck, Timer } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, s as core, useRead } from "../../core/ui";
import { getSystemHealth, listIntegrations } from "./data";
import { Failed, Labelled, Line, Loading, Pill, Refused, Segmented, Stale, body, usePoll } from "./kit";
import { refusedScreen } from "./rolesRules";
import {
  BACKUP, DASH, OFFSITE, auditDay, bytes, dateShort, dateTime, freeShare, integrationsOf, ms, number, problemsOf, uptime, within,
  type Traffic,
} from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   WHAT THE SERVER SAYS ABOUT ITSELF, read only.
   INTEGRATIONS — the web's /admin/integrations (pages/Admin.tsx
     IntegrationsPage; picture all/68 is the GM refused, in RequireAccess's
     words): password sign-in, the channel manager (SU) and WhatsApp and
     email, each Set up or Not set up with the server's sentence. The web
     shows NO key, secret, password or address, and neither does the phone:
     neither answer carries one (GET /:code/integrations, GET
     /api/channel-manager/su). Nothing is typed here.
   SYSTEM HEALTH — the web's /admin/system-health (pages/SystemHealth.tsx;
     picture new/n-admin-system-health, as dev-owner): every figure the
     server's own record, read again every minute while on screen.
   ══════════════════════════════════════════════════════════════════ */

export function Integrations({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedScreen(role, "integrations");
  const [pulled, setPulled] = useState(false);
  const list = useRead(async () => {
    if (refused) return null;
    const [here, su] = await listIntegrations(code);
    return integrationsOf(here, su);
  }, ["admin", code, "integrations"]);
  return (
    <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
      <Head title="Integrations" under="What this server has set up, as the server itself reports it." />
      {refused ? <Refused sentence={refused} /> : list.data === undefined
        ? (list.error ? <Failed title="Connection status is unavailable" error={`Treat nothing as connected until this loads. Try again. ${list.error}`} onRetry={list.reload} /> : <Loading what="what is set up" />)
        : list.data === null ? null : (
          <>
            <Stale error={list.error} />
            {list.data.map((i) => (
              <View key={i.id} style={[core.card, { gap: 10 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Plug size={16} color={c.grey400} />
                      <Text style={[t.heading, { flexShrink: 1 }]}>{i.name}</Text>
                    </View>
                    <Text style={t.eyebrow}>{i.kind}</Text>
                  </View>
                  <Pill tone={i.setUp ? "success" : "warning"} dot>{i.setUp ? "Set up" : "Not set up"}</Pill>
                </View>
                <Text style={[body, { color: c.grey600 }]}>{i.detail}</Text>
              </View>
            ))}
          </>
        )}
    </Screen>
  );
}

/* ── System health ───────────────────────────────────────────────── */

/** The web's FigureTile: an icon, the label, the figure, then its rows or its note. */
function Tile({ icon, label, value, orange, rows, note }: {
  icon: ReactNode; label: string; value: string; orange?: boolean; rows?: Array<[string, string]>; note?: ReactNode;
}) {
  return (
    <View style={[core.card, { gap: 8 }, orange && { borderColor: c.orange100, backgroundColor: c.orange50 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon}
        <Text style={[t.label, { color: c.grey600 }]}>{label}</Text>
      </View>
      <Text style={[t.figure, { fontSize: 26, color: value === DASH ? c.grey400 : orange ? c.orange700 : c.ink900 }]} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1}>{value}</Text>
      {rows?.map(([l, v]) => <Line key={l} label={l} value={v} />)}
      {typeof note === "string" ? <Text style={[t.caption, { lineHeight: 17 }]}>{note}</Text> : note}
    </View>
  );
}

/** A small line of one figure over the period, oldest on the left (Spark), as bars - no chart package. */
function Spark({ values, color }: { values: number[]; color: string }) {
  const top = Math.max(1, ...values);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 28, gap: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {values.map((v, i) => <View key={i} style={{ flex: 1, height: Math.max(1, (v / top) * 27), backgroundColor: color, borderRadius: 1 }} />)}
    </View>
  );
}

const PERIODS = [{ value: "hour", label: "Last hour" }, { value: "day", label: "Last day" }, { value: "week", label: "Last week" }] as const;
type Period = (typeof PERIODS)[number]["value"];

function TrafficTiles({ tr }: { tr: Traffic }) {
  const icon = (I: typeof Pulse, on = false) => <I size={16} color={on ? c.orange : c.grey500} />;
  return (
    <View style={{ gap: space.card }}>
      <Tile icon={icon(Pulse)} label="Requests" value={number(tr.requests)} note={<Spark values={tr.series.map((s) => s.requests)} color={c.grey400} />} />
      <Tile icon={icon(AlertTriangle, tr.errors > 0)} orange={tr.errors > 0} label="Server errors" value={number(tr.errors)}
        note={<Spark values={tr.series.map((s) => s.errors)} color={tr.errors > 0 ? c.orange : c.grey400} />} />
      <Tile icon={icon(Timer)} label="95 in 100 answered" value={within(tr.p95Ms)}
        note={<Spark values={tr.series.map((s) => (s.p95Ms === -1 ? 20000 : s.p95Ms ?? 0))} color={c.grey400} />} />
    </View>
  );
}

function Section({ title, line, children, right }: { title: string; line: string; children: ReactNode; right?: string }) {
  return (
    <View style={{ gap: space.card }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
          <Text style={[t.heading, { flex: 1 }]} accessibilityRole="header">{title}</Text>
          {right ? <Text style={[t.label, t.tab]}>{right}</Text> : null}
        </View>
        <Text style={[body, { color: c.grey500 }]}>{line}</Text>
      </View>
      {children}
    </View>
  );
}

export function SystemHealth({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedScreen(role, "systemHealth");
  const [period, setPeriod] = useState<Period>("day");
  const [pulled, setPulled] = useState(false);
  const key = ["admin", code, "system-health"];
  const read = useRead(() => (refused ? Promise.resolve(null) : getSystemHealth(code)), key);
  usePoll(key, 60_000);
  const d = read.data;
  const head = <Head title="System health" under="What the server is doing, from its own records. Nothing here leaves the server, and no guest is named. Counts are written every minute." />;
  if (refused) return <Screen refreshing={false} onRefresh={() => undefined}>{head}<Refused sentence={refused} /></Screen>;
  const b = d ? BACKUP[d.backup.state] : null;
  const free = d ? freeShare(d.disk) : null;
  const icon = (I: typeof Pulse, on = false) => <I size={16} color={on ? c.orange : c.grey500} />;
  return (
    <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
      {head}
      {d === undefined ? (read.error ? <Failed error={read.error} onRetry={read.reload} /> : <Loading what="the server's health" />)
        : d === null || !b ? null : (
          <>
            <Stale error={read.error} />
            <Tile icon={icon(ServerIcon)} label="Server up for" value={uptime(d.uptimeSeconds)}
              rows={[["Version", d.version], ["Started", dateTime(d.startedAt)]]} />
            <Tile icon={icon(Database)} label="Database" value={bytes(d.databaseBytes)}
              rows={[["Connections in use", `${d.pool.inUse} of ${d.pool.max}`], ["Waiting for one", number(d.pool.waiting)]]} />
            <Tile icon={icon(HardDrive, free !== null && free < 0.1)} orange={free !== null && free < 0.1} label="Disk free"
              value={d.disk ? bytes(d.disk.freeBytes) : DASH}
              {...(d.disk ? { rows: [["Of", bytes(d.disk.totalBytes)], ["Free", `${Math.round(free! * 100)}%`]] as Array<[string, string]> }
                : { note: "The server did not say how much disk is free." })} />
            <Tile icon={icon(ShieldCheck, d.backup.state === "failed")} orange={d.backup.state === "failed"} label="Last backup" value={b.value}
              {...(d.backup.at && d.backup.state !== "none" && d.backup.state !== "unreadable"
                ? { rows: [["At", dateTime(d.backup.at)], ["Copy off the server", d.backup.offsite ? OFFSITE[d.backup.offsite] : DASH]] as Array<[string, string]> }
                : { note: b.note })} />

            <Section title="Requests" line="Every request to the server, its result and how quickly it was answered.">
              <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />
              <TrafficTiles tr={d.traffic[period]} />
            </Section>

            <Section title="Hotels" line="Each hotel's business date and its last night audit. A day left open loses its room nights.">
              {d.hotels.map((h) => {
                const day = auditDay(h.businessDate, h.today);
                return (
                  <View key={h.code} style={[core.card, { gap: 10 }]}>
                    <Text style={[t.label, { color: c.ink900, ...face[600] }]}>{h.name}</Text>
                    <Labelled label="Business date" value={dateShort(h.businessDate)} />
                    <Labelled label="Last night audit" value={h.lastAuditAt ? dateTime(h.lastAuditAt) : DASH} />
                    <Labelled label="Day"><Pill tone={day.tone}>{day.words}</Pill></Labelled>
                  </View>
                );
              })}
            </Section>

            <Section title="Slowest routes" line="The last day, slowest on average first.">
              {d.slowest.length === 0 ? <Text style={[body, { color: c.grey500 }]}>No requests in the last day.</Text> : d.slowest.map((r) => (
                <View key={`${r.method} ${r.route}`} style={[core.card, { gap: 10 }]}>
                  <Text style={[t.caption, { color: c.ink900 }]} selectable>{`${r.method} ${r.route}`}</Text>
                  <Labelled label="Requests" value={number(r.requests)} />
                  <Labelled label="Average" value={ms(r.avgMs)} />
                  <Labelled label="Slowest" value={ms(r.maxMs)} />
                </View>
              ))}
            </Section>

            {d.leadsReads ? (
              <Section title="Leads app reads" right={`Limit ${d.leadsReads.cap === null ? DASH : number(d.leadsReads.cap)} a day`}
                line="What this system read from the leads app, by Google's day: midnight to midnight Pacific time, 12:30 pm in India (1:30 pm in winter). The app's free allowance is 50,000 a day, shared with the app itself; this system stops at its own limit.">
                {d.leadsReads.days.length === 0 ? <Text style={[body, { color: c.grey500 }]}>Nothing read from the leads app in the last week.</Text> : (
                  <View style={core.card}>
                    {d.leadsReads.days.map((x) => <Line key={x.day} label={dateShort(x.day)} value={number(x.reads)} />)}
                  </View>
                )}
              </Section>
            ) : null}

            <Section title="Errors and slow queries" line="The last week. An error is named by its kind, never by what it said, so no guest's details are kept.">
              {problemsOf(d).length === 0 ? <Text style={[body, { color: c.grey500 }]}>None in the last week.</Text> : problemsOf(d).map((p) => (
                <View key={p.key} style={[core.card, { gap: 10 }]}>
                  <Text style={[t.caption, { color: c.ink900 }]} selectable>{p.what}</Text>
                  <Labelled label="Where" value={p.where} />
                  <Labelled label="Times" value={number(p.count)} />
                  <Labelled label="Last" value={dateTime(p.last)} />
                </View>
              ))}
            </Section>
          </>
        )}
    </Screen>
  );
}
