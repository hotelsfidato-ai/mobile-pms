import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowRight, Info } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import { ON_THE_WEBSITE, phoneRoute } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, s as core, notKnown, ripple, useRead } from "../../core/ui";
import { getTaxInUse, listAdminProperties, listProperties, setPropertyOpen } from "./data";
import { Btn, Empty, Failed, Foot, Line, Loading, Pill, Refused, Stale, Toast, body, confirm, saidOf, useAct, useSaid, type Said } from "./kit";
import { refusedScreen } from "./roles";
import { DASH, placeLine, runs, taxRows, type AdminProperty } from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   PROPERTIES on a phone — the web's /properties (pages/Properties.tsx;
   pictures all/21 as dev-gm, the ordinary cards, and new/n-admin-
   properties as dev-owner, the group administrator's). Two sources, as
   the web: a group administrator reads every property, closed ones too
   (GET /api/admin/hotels), with Close / Reopen; anybody else the
   properties they reach (GET /api/hotels/:code each). Each card's GST is
   finance's own reader (GET /:code/tax), one line per kind, a dash where
   nobody has set a rate.

   Left on the website (MODULE.md): Add a property (the provisioning key),
   Edit a property's details, a test hotel's controls (typed RESET and
   RE-COPY) and the owner's full reset (typed code, a backup, a clear).
   Close asks first on the phone; the server refuses it while anybody is
   checked in, and the card says so before the button is pressed.
   ══════════════════════════════════════════════════════════════════ */

export function Properties({ hotel, role, who }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedScreen(role, "properties");
  const { said, say, close } = useSaid();
  const [pulled, setPulled] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const groupAdmin = who.scope.isGroupAdmin;
  const codes = who.hotels.map((h) => h.code);
  const testCodes = new Set(who.hotels.filter((h) => h.testOf).map((h) => h.code));
  const key = ["admin", code, "properties"] as const;
  const plain = useRead(() => (refused ? Promise.resolve(null) : listProperties(codes)), [...key, "plain", codes.join(",")]);
  const admin = useRead(async () => {
    if (refused || !groupAdmin) return null;
    const started = Date.now();
    const answer = await listAdminProperties();
    setSeenAt(started);
    return answer;
  }, [...key, "admin"]);
  const refresh = () => void cache.invalidateQueries({ queryKey: key });
  const isAdmin = groupAdmin || (admin.data?.length ?? 0) > 0;
  const rows = (admin.data ?? []).filter((h) => !testCodes.has(h.code) && !h.testOf);
  const open = rows.filter((h) => h.isActive);
  const closed = rows.filter((h) => !h.isActive);

  const table = plain.data ? {
    title: "Properties", subtitle: who.scope.fullName,
    columns: ["Property", "Code", "Address", "Rooms", "Check-in", "Check-out"],
    rows: plain.data.filter((p) => !testCodes.has(p.id)).map((p) => [p.name, p.id, p.address, String(p.rooms), p.checkInTime, p.checkOutTime]),
  } : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && (plain.loading || admin.loading)} onRefresh={() => { setPulled(true); plain.reload(); admin.reload(); }}>
        <Head title="Properties" under={refused ? undefined : isAdmin ? `${open.length} open${closed.length ? ` · ${closed.length} closed` : ""}` : "The properties you can reach."} />
        {refused ? <Refused sentence={refused} /> : (
          <>
            <ExportButtons table={table} />
            {isAdmin && admin.data ? (
              <>
                <Stale error={admin.error} />
                {open.map((h) => <AdminCard key={h.id} h={h} seenAt={seenAt} onSaid={say} onDone={(s) => { say(s); refresh(); }} />)}
                {closed.length ? <Text style={[t.heading, { marginTop: space.section - space.card }]} accessibilityRole="header">Closed</Text> : null}
                {closed.map((h) => <AdminCard key={h.id} h={h} seenAt={seenAt} onSaid={say} onDone={(s) => { say(s); refresh(); }} />)}
                <View style={[core.card, { gap: 6 }]}>
                  <Text style={[t.label, { color: c.ink900, ...face[600] }]}>Add a property</Text>
                  <Text style={[body, { color: c.grey500 }]}>{ON_THE_WEBSITE}: it takes the provisioning key.</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Info size={14} color={c.grey500} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}><Foot>Creating a property makes the hotel and its invoice series; add its room types and rooms in Set up this hotel. The code appears in every URL and every invoice number and cannot be changed afterwards.</Foot></View>
                </View>
              </>
            ) : plain.data === undefined || (groupAdmin && admin.data === undefined)
              ? (plain.error ? <Failed title="The property list did not load" error={`Nothing was changed. Try again. ${plain.error}`} onRetry={plain.reload} /> : <Loading what="the properties" />)
              : plain.data === null ? null : (
                <>
                  <Stale error={plain.error} />
                  {plain.data.length === 0 ? <Empty title="No properties" description="The properties you can reach." /> : plain.data.map((p) => {
                    const id = who.hotels.find((h) => h.code === p.id)?.id;
                    return (
                      <View key={p.id} style={[core.card, { gap: 4 }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={t.heading}>{p.name}</Text>
                          {testCodes.has(p.id) ? <Pill tone="warning">TEST</Pill> : null}
                        </View>
                        <Text style={[body, { color: c.grey500 }]}>{p.address}</Text>
                        <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderColor: c.grey100 }}>
                          <Line label="Rooms sellable today" value={String(p.rooms)} />
                          <Line label="Types" value={p.roomTypes.join(" · ")} />
                          <Line label="Check in / out" value={`${p.checkInTime} / ${p.checkOutTime}`} />
                          <Tax code={p.id} />
                        </View>
                        <Links code={p.id} opens={runs(who.scope, id)} calendar="Open the Calendar" />
                      </View>
                    );
                  })}
                </>
              )}
          </>
        )}
      </Screen>
      <Toast said={said} onClose={close} />
    </View>
  );
}

/** TaxInUseRows: loading in words, a failed read said in one row - never a dash, which would claim nothing is set. */
function Tax({ code }: { code: string }) {
  const tax = useRead(() => getTaxInUse(code), ["admin", code, "tax-in-use"]);
  if (tax.data === undefined) return tax.error ? <Line label="GST" value="Could not load. Reload to try again." /> : <Line label="GST" value="Reading…" />;
  return <>{taxRows(tax.data).map((r) => <Line key={r.key} label={r.label} value={r.value} />)}</>;
}

/** The card's links: orange words. "Open" (the property's own page) is on the website for now. */
function Links({ code, opens, calendar }: { code: string; opens: boolean; calendar: string | null }) {
  const cal = calendar ? phoneRoute(`/h/${code}/calendar`, code) : null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, marginTop: 4 }}>
      {opens ? (
        <View style={{ minHeight: 44, justifyContent: "center" }} accessibilityLabel={`Open: ${ON_THE_WEBSITE}`}>
          <Text style={[t.label, { color: c.grey400 }]}>Open · {ON_THE_WEBSITE}</Text>
        </View>
      ) : null}
      {calendar && cal ? (
        <Pressable onPress={() => router.push(cal as never)} accessibilityRole="link" android_ripple={ripple} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[t.label, { color: c.orange700 }]}>{calendar}</Text>
          <ArrowRight size={14} color={c.orange700} />
        </Pressable>
      ) : null}
    </View>
  );
}

function AdminCard({ h, seenAt, onSaid, onDone }: { h: AdminProperty; seenAt: number; onSaid: (s: Said) => void; onDone: (s: Said) => void }) {
  const act = useAct(seenAt);
  const busy = act.busy || act.stuck;
  const toggle = async () => {
    if (busy) return;
    /* The web closes at one tap; closing a property asks first on the phone (BRIEF-T3). */
    if (h.isActive && !(await confirm(`Close ${h.name}?`, "A closed property drops off every list but this one. It can be reopened here.", "Close"))) return;
    await act.run(() => setPropertyOpen(h.code, !h.isActive), {
      ok: () => onDone({ title: h.isActive ? `${h.name} is closed` : `${h.name} is open`, tone: "ok" }),
      no: (e) => onSaid(saidOf(e, "Not changed")),
      unknown: (e) => onDone({ ...notKnown(h.isActive ? "closed" : "reopened", "this property's card", e), tone: "bad" }),
    });
  };
  return (
    <View style={[core.card, { gap: 4 }, !h.isActive && { opacity: 0.6 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
        <Text style={t.heading}>{h.name}</Text>
        <Text style={[body, t.tab, { color: c.grey500 }]}>{h.code}</Text>
        {!h.isActive ? <Pill tone="neutral">Closed</Pill> : null}
      </View>
      <Text style={[body, { color: c.grey500 }]}>{placeLine(h.addressLine, h.city, h.state) || DASH}</Text>
      <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderColor: c.grey100 }}>
        <Line label="All rooms" value={h.rooms === 0 ? DASH : String(h.rooms)} />
        <Line label="Types" value={h.roomTypes.length ? h.roomTypes.join(" · ") : DASH} />
        <Line label="GSTIN" value={h.gstin ?? DASH} />
        <Tax code={h.code} />
      </View>
      {h.isActive && h.checkedIn > 0 ? (
        <Text style={[body, { color: c.grey500, marginTop: 8 }]}>{`${h.checkedIn} booking${h.checkedIn === 1 ? "" : "s"} checked in - it cannot be closed until they check out.`}</Text>
      ) : null}
      <View style={{ marginTop: 8, paddingTop: 4, borderTopWidth: 1, borderColor: c.grey100, gap: 4 }}>
        <Links code={h.code} opens calendar={h.isActive ? "Calendar" : null} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Btn variant="ghost" label="Edit" disabled onPress={() => undefined} a11y={`Edit: ${ON_THE_WEBSITE}`} />
          <Btn label={act.busy ? "…" : h.isActive ? "Close" : "Reopen"} disabled={busy || (h.isActive && h.checkedIn > 0)} onPress={() => void toggle()} />
        </View>
        <Text style={t.caption}>{`Edit, the test hotel and the full reset: ${ON_THE_WEBSITE.toLowerCase()}.`}</Text>
        {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("changed", "this property's card").line}</Text> : null}
      </View>
    </View>
  );
}
