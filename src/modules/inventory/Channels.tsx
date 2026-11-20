import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AlertTriangle, ArrowRightLeft, CalendarClock, CheckCircle2, IndianRupee, Send, type LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { dateShort } from "../../core/format";
import { c, space, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead, useStuck } from "../../core/ui";
import {
  OUTCOME, ariBlocked, contentBlocked, liveButOff, needsDealing, siteLine, textRupees, typedCount, whenOf,
  type ContentMealPlan, type ContentRoomType, type SendResult, type SuContent,
} from "./config";
import {
  checkSuLogin, markChannelBookingDone, readChannelBookings, readSources, readSuAvailability, readSuContent, readSuStatus,
  saveSuHotel, saveSuRatePlan, saveSuRoomType, sendSuAvailability, sendSuContent,
} from "./configData";
import { asRole, mayReach } from "../../core/menu";
import { Btn, Failed, Field, Loading, NotYourRole, Pill, Select, SwitchLine, TextBox } from "./configKit";
import { CHANNEL_BOOKINGS_REFUSED, SOURCES_READ, SU_REFUSED, readsChannelBookings, setsUpSu, whyNot } from "./configRoles";
import { Toast, body, saidOf, type Said } from "./kit";
import { suChannelName } from "./suChannels";

/* ══════════════════════════════════════════════════════════════════
   THE CHANNEL MANAGER on a phone — the web's /h/:code/channels
   (src/modules/channel-manager/pages/ChannelManager.tsx and
   components/SuSetup.tsx; picture pms-shots/all/73-coming-soon-channel-
   manager, taken as the GM: no SU setup).

   The wire to the booking sites, through SU. The owner and an
   Administrator see the SU setup (access.ts SU_ROLES, D17-85): the login,
   this hotel on SU, its room types' and meal plans' mapping to SU's ids,
   Send to SU, and rooms left, prices and closures. Everybody who reaches
   the page - the GM too - sees the bookings the sites sent and marks one
   dealt with. NOTHING IS SUGGESTED: no SU id is filled in for anybody.
   Saving sends nothing; sending is its own press. A send whose reply was
   lost takes no more taps until the screen is read again (MEMORY 16).
   ══════════════════════════════════════════════════════════════════ */

const WHAT_IT_DOES: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: CalendarClock, title: "Rooms left, sent out", body: "Sell a room here and SU tells the booking sites, so the same room is not sold twice." },
  { Icon: IndianRupee, title: "Prices and closures, sent out", body: "The prices and closures on Rates go to SU as they change. A date with no price goes to SU closed." },
  { Icon: ArrowRightLeft, title: "Bookings, taken in", body: "A booking site's booking arrives as a booking, and its cancellation cancels it. Anything it cannot read waits for a person, with the reason." },
];
const NEEDS = [
  "SU's test account, its keys in the server's settings (never in a screen or a chat), and this server's booking address registered with SU.",
  "SU's certification: SU's test cases, then a live session with SU, before the live account is opened.",
  "Room types and meal plans matched to SU's ids. A wrong match oversells the wrong room type.",
  "Each booking site's SU code, picked on Booking sources. A booking from a site with no code waits for a person.",
  "This hotel switched on in Settings, with the account the connection works as.",
  "One rate everywhere, or a rate per channel. Still to be decided, and it shapes Rates.",
];

const Box = ({ children }: { children: ReactNode }) => (
  <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>{children}</View>
);
const H2 = ({ children }: { children: string }) => <Text style={t.heading} accessibilityRole="header">{children}</Text>;
/** The section's note, behind the web's (i): on a phone, said under the heading. */
const Note = ({ children }: { children: string }) => <Text style={[t.caption, { color: c.grey600 }]}>{children}</Text>;

export function Channels({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const router = useRouter();
  const cache = useQueryClient();
  const maySetUp = setsUpSu(role);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const cannotSources = whyNot(SOURCES_READ, role);
  const sources = useRead(() => (cannotSources ? Promise.resolve(null) : readSources(code)), ["inventory", code, "booking-sources"]);
  const sites = (sources.data ?? []).filter((s) => s.kind === "ota" && s.isActive);
  const reread = () => { setPulled(true); void cache.invalidateQueries({ queryKey: ["inventory", code] }); void cache.invalidateQueries({ queryKey: ["inventory", "su-status"] }); };

  /* RequireAccess path="/h/:code/channels": the menu's owner, Administrator and GM. */
  if (!mayReach(asRole(role), "/h/:code/channels")) {
    return <Screen refreshing={false} onRefresh={() => undefined}><Head title="Channel manager" /><NotYourRole role={role} screen="Channel manager" /></Screen>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && sources.loading} onRefresh={reread}>
        <Head title="Channel manager" under="The connection between this system and the booking sites, through SU. Nothing is sent or taken until SU is set up and this hotel is switched on." />
        {maySetUp ? <SuSetup code={code} onSaid={setSaid} /> : (
          <Box><H2>The SU setup</H2><Text style={[body, { color: c.grey600 }]}>{SU_REFUSED}</Text></Box>
        )}
        {readsChannelBookings(role) ? <ChannelBookings code={code} onSaid={setSaid} /> : (
          <Box><H2>Bookings from the booking sites</H2><Text style={[body, { color: c.grey600 }]}>{CHANNEL_BOOKINGS_REFUSED}</Text></Box>
        )}
        <Box>
          {WHAT_IT_DOES.map((x) => (
            <View key={x.title} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}><x.Icon size={14} color={c.grey600} /></View>
                <Text style={[t.label, { color: c.ink900 }]}>{x.title}</Text>
              </View>
              <Text style={[body, { color: c.grey600 }]}>{x.body}</Text>
            </View>
          ))}
        </Box>
        <Box>
          <H2>What it still needs before it goes live</H2>
          {NEEDS.map((n, i) => (
            <View key={n} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={[t.label, t.tab, { width: 12, color: c.grey500 }]}>{i + 1}</Text>
              <Text style={[body, { flex: 1, color: c.ink900, fontSize: 16, lineHeight: 24 }]}>{n}</Text>
            </View>
          ))}
        </Box>
        {sources.data ? (
          <Box>
            <H2>Booking sites and their SU codes</H2>
            {sites.length === 0 ? <Text style={[body, { color: c.grey500 }]}>No booking site is recorded yet.</Text> : sites.map((s, i) => (
              <View key={s.id} style={{ gap: 2, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                <Text style={[t.label, { color: c.ink900 }]}>{s.name}</Text>
                <Text style={[t.label, { color: c.grey600 }]}>{siteLine(s.channelCode, suChannelName(s.channelCode))}</Text>
              </View>
            ))}
            <Text style={[t.label, { color: c.grey500 }]}>
              Codes are picked on{" "}
              <Text accessibilityRole="link" style={{ textDecorationLine: "underline" }} onPress={() => router.push(`/inventory/${code}/booking-sources`)}>Booking sources</Text>.
            </Text>
          </Box>
        ) : sources.error ? <Text style={[t.caption, { color: c.red700 }]}>Could not read the booking sites: {sources.error}</Text> : null}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── The SU setup, for the owner and an Administrator (SuSetup.tsx) ── */

function SuSetup({ code, onSaid }: { code: string; onSaid: (s: Said) => void }) {
  const content = useRead(() => readSuContent(code), ["inventory", code, "su-content"]);
  if (content.data === undefined) {
    return content.error ? <Failed title="The SU setup did not load" what="The SU setup" error={content.error} onRetry={content.reload} /> : <Loading words="Reading the SU setup…" />;
  }
  const d = content.data;
  return (
    <>
      <SuLogin onSaid={onSaid} />
      <HotelOnSu code={code} data={d} onSaid={onSaid} />
      <Box>
        <H2>Room types</H2>
        <Note>Each one goes to SU under the id you give it, with its rack rate and its rooms. A room type with no rack rate cannot be listed.</Note>
        {d.roomTypes.map((x, i) => <RoomTypeRow key={x.id} code={code} type={x} suRoomTypes={d.suRoomTypes} first={i === 0} onSaid={onSaid} />)}
      </Box>
      <Box>
        <H2>Meal plans</H2>
        <Note>Each meal plan sold online is a rate plan on SU. Pick what SU should call it: it is what the booking sites show a guest.</Note>
        {d.mealPlans.map((p, i) => <MealPlanRow key={p.code} code={code} plan={p} suMealPlans={d.suMealPlans} first={i === 0} onSaid={onSaid} />)}
      </Box>
      <SendToSu code={code} data={d} onSaid={onSaid} />
      <RoomsAndPrices code={code} data={d} onSaid={onSaid} />
    </>
  );
}

/** One write at a time; `stops`: a send to SU whose reply was lost takes no more taps (MEMORY 16). */
function useWrite(stops: boolean) {
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const run = async <T,>(write: () => Promise<T>, ok: (r: T) => void, fail: (e: unknown, unknown: boolean) => void) => {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true; setBusy(true);
    try { ok(await write()); } catch (e) { fail(e, stops && stuck.stop(e)); } finally { latch.current = false; setBusy(false); }
  };
  return { busy, stuck: stuck.stuck, run };
}

function SuLogin({ onSaid }: { onSaid: (s: Said) => void }) {
  const status = useRead(readSuStatus, ["inventory", "su-status"]);
  const w = useWrite(false);
  const s = status.data;
  const check = () => void w.run(checkSuLogin,
    () => { onSaid({ title: "SU accepted the login.", tone: "ok" }); status.reload(); },
    (e) => { onSaid(saidOf("SU login did not work", e)); status.reload(); });
  return (
    <Box>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <H2>SU login</H2>
        {s?.configured ? <Pill>{s.environment === "live" ? "Live account" : "Test account"}</Pill> : s ? <Pill tone="warning">Not set up</Pill> : null}
      </View>
      {status.error ? <Text style={[t.caption, { color: c.red700 }]}>Could not read the SU login: {status.error}</Text> : null}
      {s && !s.configured && s.reason ? <Text style={[body, { color: c.grey600 }]}>{s.reason}</Text> : null}
      {s?.lastLogin ? <Text style={[t.label, { color: c.grey600 }]}>Last checked {whenOf(s.lastLogin.at)}: {s.lastLogin.ok ? "SU accepted the login." : s.lastLogin.reason}</Text> : null}
      {s?.configured ? <Text style={[t.label, { color: c.grey500 }]}>Logins used this hour: {s.loginsThisHour ?? "-"} of {s.loginsPerHour}.</Text> : null}
      <View style={{ flexDirection: "row" }}><Btn label={w.busy ? "Checking" : "Check the login"} disabled={!s?.configured || w.busy} onPress={check} /></View>
    </Box>
  );
}

function HotelOnSu({ code, data, onSaid }: { code: string; data: SuContent; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const initial = () => ({
    suHotelId: data.channel?.suHotelId ?? "", countryCode: data.channel?.countryCode ?? "",
    contactFirstName: data.channel?.contactFirstName ?? "", contactLastName: data.channel?.contactLastName ?? "",
    description: data.channel?.description ?? "",
  });
  const [form, setForm] = useState(initial);
  useEffect(() => { setForm(initial()); }, [data.channel]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = useWrite(false);
  const set = (k: keyof ReturnType<typeof initial>) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const shown = (v: string | null) => (v && v.trim() ? v : "-");
  const save = () => void w.run(() => saveSuHotel(code, form),
    () => { onSaid({ title: "Saved. Nothing has been sent to SU.", tone: "ok" }); void cache.invalidateQueries({ queryKey: ["inventory", code, "su-content"] }); },
    (e) => onSaid(saidOf("Not saved", e)));
  return (
    <Box>
      <H2>This hotel on SU</H2>
      <Text style={[t.label, { color: c.grey500 }]}>
        From the hotel record, set on the Properties screen: {shown(data.hotel.addressLine)}, {data.hotel.city} · phone {shown(data.hotel.phone)} · email {shown(data.hotel.email)}.
      </Text>
      <Text style={[t.label, { color: c.grey500 }]}>
        PIN code {shown(data.hotel.postalCode)} · map point {data.hotel.latitude && data.hotel.longitude ? `${data.hotel.latitude}, ${data.hotel.longitude}` : "-"}. Set in Settings, on the Property tab (on the website for now).
      </Text>
      <Field label="SU hotel id" hint="Up to 20 letters, digits and hyphens. It cannot change once SU has it.">
        <TextBox label="SU hotel id" value={form.suHotelId} caps="characters" maxLength={20} placeholder="" onChangeText={set("suHotelId")} />
      </Field>
      <Field label="Country" hint="Its two-letter code."><TextBox label="Country" value={form.countryCode} caps="characters" maxLength={2} placeholder="" onChangeText={set("countryCode")} /></Field>
      <Field label="Contact's first name"><TextBox label="Contact's first name" value={form.contactFirstName} caps="words" placeholder="" onChangeText={set("contactFirstName")} /></Field>
      <Field label="Contact's last name"><TextBox label="Contact's last name" value={form.contactLastName} caps="words" placeholder="" onChangeText={set("contactLastName")} /></Field>
      <Field label="Description" hint="What SU shows about the hotel, up to 2,000 characters.">
        <TextBox label="Description" value={form.description} lines={3} maxLength={2000} placeholder="" onChangeText={set("description")} />
      </Field>
      <View style={{ flexDirection: "row" }}><Btn label={w.busy ? "Saving" : "Save hotel details"} disabled={w.busy || !form.suHotelId.trim()} onPress={save} /></View>
    </Box>
  );
}

function LastSend({ record }: { record: { sentAt: string | null; sentOk: boolean | null; sentResult: string | null } | null }) {
  if (!record?.sentAt) return <Text style={[t.label, { color: c.grey500 }]}>Not sent yet</Text>;
  return <Text style={[t.label, { color: record.sentOk ? c.grey600 : c.red700 }]}>{whenOf(record.sentAt)}: {record.sentResult}</Text>;
}

function RoomTypeRow({ code, type, suRoomTypes, first, onSaid }: {
  code: string; type: ContentRoomType; suRoomTypes: SuContent["suRoomTypes"]; first: boolean; onSaid: (s: Said) => void;
}) {
  const cache = useQueryClient();
  const m = type.mapping;
  const [suRoomId, setSuRoomId] = useState(m?.suRoomId ?? "");
  const [suRoomType, setSuRoomType] = useState(m ? String(m.suRoomType) : "");
  const [maxChildren, setMaxChildren] = useState(m ? String(m.maxChildren) : "");
  const [isConnected, setIsConnected] = useState(m?.isConnected ?? false);
  const w = useWrite(false);
  const ready = suRoomId.trim() !== "" && suRoomType !== "" && maxChildren.trim() !== "";
  const save = () => void w.run(() => saveSuRoomType(code, type.id, { suRoomId, suRoomType: Number(suRoomType), maxChildren: Number(maxChildren), isConnected }),
    () => { onSaid({ title: `${type.name} saved. Nothing has been sent to SU.`, tone: "ok" }); void cache.invalidateQueries({ queryKey: ["inventory", code, "su-content"] }); },
    (e) => onSaid(saidOf(`${type.name} not saved`, e)));
  return (
    <View style={{ gap: 12, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={[t.label, { color: c.ink900 }]}>{type.name}</Text>
          {m?.onSu ? <Pill>{m.onSu === "active" ? "On SU" : "Taken off SU"}</Pill> : null}
        </View>
        <Text style={[t.label, t.tab, { color: c.grey500 }]}>sleeps {type.maxOccupancy} · {type.rooms} rooms · rack rate {textRupees(type.rackRate)}</Text>
      </View>
      <Field label="SU room id"><TextBox label="SU room id" value={suRoomId} maxLength={20} caps="none" placeholder="" onChangeText={setSuRoomId} /></Field>
      <Field label="SU room type">
        <Select label="SU room type" value={suRoomType} placeholder="Pick one" options={suRoomTypes.map((o) => ({ value: String(o.code), label: o.name }))} onChange={setSuRoomType} />
      </Field>
      <Field label="Children, at most" hint={`Fewer than ${type.maxOccupancy}.`}>
        <TextBox label="Children, at most" value={maxChildren} keyboardType="number-pad" placeholder="" onChangeText={(v) => setMaxChildren(typedCount(v))} />
      </Field>
      <SwitchLine label="Send to SU" on={isConnected} onChange={setIsConnected} />
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row" }}><Btn label={w.busy ? "Saving" : `Save ${type.name}`} disabled={w.busy || !ready} onPress={save} /></View>
        <LastSend record={m} />
      </View>
    </View>
  );
}

function MealPlanRow({ code, plan, suMealPlans, first, onSaid }: {
  code: string; plan: ContentMealPlan; suMealPlans: SuContent["suMealPlans"]; first: boolean; onSaid: (s: Said) => void;
}) {
  const cache = useQueryClient();
  const m = plan.mapping;
  const [suRatePlanId, setSuRatePlanId] = useState(m?.suRatePlanId ?? "");
  const [suMealPlan, setSuMealPlan] = useState(m ? String(m.suMealPlan) : "");
  const [isConnected, setIsConnected] = useState(m?.isConnected ?? false);
  const w = useWrite(false);
  const ready = suRatePlanId.trim() !== "" && suMealPlan !== "";
  const save = () => void w.run(() => saveSuRatePlan(code, plan.code, { suRatePlanId, suMealPlan: Number(suMealPlan), isConnected }),
    () => { onSaid({ title: `${plan.name} saved. Nothing has been sent to SU.`, tone: "ok" }); void cache.invalidateQueries({ queryKey: ["inventory", code, "su-content"] }); },
    (e) => onSaid(saidOf(`${plan.name} not saved`, e)));
  return (
    <View style={{ gap: 12, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={[t.label, { color: c.ink900 }]}>{plan.name}</Text>
          {m?.onSu ? <Pill>{m.onSu === "active" ? "On SU" : "Taken off SU"}</Pill> : null}
        </View>
        <Text style={[t.label, { color: c.grey500 }]}>{plan.includes}</Text>
      </View>
      <Field label="SU rate plan id"><TextBox label="SU rate plan id" value={suRatePlanId} maxLength={20} caps="none" placeholder="" onChangeText={setSuRatePlanId} /></Field>
      <Field label="SU meal plan">
        <Select label="SU meal plan" value={suMealPlan} placeholder="Pick one" options={suMealPlans.map((o) => ({ value: String(o.code), label: o.name }))} onChange={setSuMealPlan} />
      </Field>
      <SwitchLine label="Send to SU" on={isConnected} onChange={setIsConnected} />
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row" }}><Btn label={w.busy ? "Saving" : `Save ${plan.name}`} disabled={w.busy || !ready} onPress={save} /></View>
        <LastSend record={m} />
      </View>
    </View>
  );
}

function SendToSu({ code, data, onSaid }: { code: string; data: SuContent; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const [results, setResults] = useState<SendResult[] | null>(null);
  const w = useWrite(true);
  const off = liveButOff(data);
  const send = () => {
    setResults(null);
    void w.run(() => sendSuContent(code),
      (r) => { setResults(r.results); onSaid({ title: "SU accepted everything that was sent.", tone: "ok" }); void cache.invalidateQueries({ queryKey: ["inventory", code, "su-content"] }); },
      (e, unknown) => {
        if (unknown) { const n = notKnown("sent", "each room type's and meal plan's last send"); onSaid({ title: n.title, body: n.body, tone: "bad" }); }
        else onSaid(saidOf("Not everything went to SU", e));
        void cache.invalidateQueries({ queryKey: ["inventory", code, "su-content"] });
      });
  };
  return (
    <Box>
      <H2>Send to SU</H2>
      {!data.su.configured ? <Text style={[body, { color: c.grey600 }]}>SU is not set up on this server yet, so nothing can be sent.</Text> : null}
      {off ? <Text style={[body, { color: c.grey600 }]}>This server uses SU's live account, and this hotel is not switched on for the channel manager. Nothing is sent to the live account for it.</Text> : null}
      {data.problems.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={[body, { color: c.ink900 }]}>SU needs these first:</Text>
          {data.problems.map((p) => (
            <View key={p} style={{ flexDirection: "row", gap: 8 }}>
              <AlertTriangle size={16} color={c.tangerine700} style={{ marginTop: 2 }} />
              <Text style={[t.label, { flex: 1, color: c.grey700 }]}>{p}</Text>
            </View>
          ))}
        </View>
      ) : data.su.configured && !off ? (
        <Text style={[body, { color: c.grey600 }]}>Ready. Sending gives SU this hotel, its room types marked "Send to SU" and its meal plans marked "Send to SU". It sends no prices by date and no rooms left.</Text>
      ) : null}
      {w.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("sent", "each room type's and meal plan's last send").line}</Text> : null}
      <View style={{ flexDirection: "row" }}>
        <Btn label={w.busy ? "Sending" : "Send to SU"} icon={Send} variant="primary" disabled={contentBlocked(data) || w.busy || w.stuck} onPress={send} />
      </View>
      {results ? results.map((r, i) => (
        <View key={`${r.kind}-${r.name}-${i}`} style={{ flexDirection: "row", gap: 8 }}>
          {r.ok ? <CheckCircle2 size={16} color={c.grey500} style={{ marginTop: 2 }} /> : <AlertTriangle size={16} color={c.red} style={{ marginTop: 2 }} />}
          <Text style={[t.label, { flex: 1, color: r.ok ? c.grey700 : c.red700 }]}>{r.name} ({r.kind}), {r.action}: {r.ok ? "SU accepted it." : r.reason}</Text>
        </View>
      )) : null}
    </Box>
  );
}

function RoomsAndPrices({ code, data, onSaid }: { code: string; data: SuContent; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const state = useRead(() => readSuAvailability(code), ["inventory", code, "su-availability"]);
  const [sending, setSending] = useState<"all" | "changes" | null>(null);
  const w = useWrite(true);
  const blocked = ariBlocked(data);
  const send = (kind: "all" | "changes") => {
    setSending(kind);
    void w.run(() => sendSuAvailability(code, kind),
      (r) => onSaid({ title: r.reason, tone: "ok" }),
      (e, unknown) => {
        if (unknown) { const n = notKnown("sent", "the sends below"); onSaid({ title: n.title, body: n.body, tone: "bad" }); }
        else onSaid(saidOf("Not everything reached SU", e));
      }).finally(() => { setSending(null); void cache.invalidateQueries({ queryKey: ["inventory", code, "su-availability"] }); });
  };
  const s = state.data;
  return (
    <Box>
      <H2>Rooms left, prices and closures</H2>
      <Note>A year at a time. Send a year when a hotel first goes on SU; after that only what changed is sent, on its own every minute once the hotel is switched on. Where a meal plan has no price of its own, the room type's rack rate goes, so the room keeps selling; where there is no price at all, the date goes to SU closed, so no booking site sells it at an old price.</Note>
      {blocked ? <Text style={[body, { color: c.grey600 }]}>Send the hotel, its room types and its meal plans to SU first.</Text> : null}
      {w.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("sent", "the sends below").line}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Btn label={sending === "all" ? "Sending a year" : "Send a year"} disabled={blocked || w.busy || w.stuck} onPress={() => send("all")} />
        <Btn label={sending === "changes" ? "Sending changes" : "Send what changed"} disabled={blocked || w.busy || w.stuck} onPress={() => send("changes")} />
      </View>
      {state.error ? <Text style={[t.caption, { color: c.red700 }]}>Could not read what was sent to SU: {state.error}</Text> : null}
      {s && s.atRackRate.nights > 0 ? (
        <Text style={[body, { color: c.ink900 }]}>
          {s.atRackRate.nights} night{s.atRackRate.nights === 1 ? " is" : "s are"} selling at the rack rate{s.atRackRate.firstDate ? `, from ${dateShort(s.atRackRate.firstDate)}` : ""} — no price set for that meal plan.
        </Text>
      ) : null}
      {s?.pushes.map((p) => (
        <Text key={p.at} style={[t.label, { color: p.ok ? c.grey600 : c.red700 }]}>
          {whenOf(p.at)} · {p.kind === "all" ? "a year" : "what changed"} · {p.dates} dates in {p.requests} request{p.requests === 1 ? "" : "s"} · {p.result}
          {p.unpricedDates > 0 ? ` · ${p.unpricedDates} closed for want of a price` : ""}
          {p.rackDates > 0 ? ` · ${p.rackDates} at the rack rate, no price set for the plan` : ""}
        </Text>
      ))}
    </Box>
  );
}

/* ── The bookings SU sent: the GM too (D27-183, Q6) ─────────────── */

function ChannelBookings({ code, onSaid }: { code: string; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const list = useRead(() => readChannelBookings(code), ["inventory", code, "channel-bookings"]);
  const [marking, setMarking] = useState<string | null>(null);
  const latch = useRef(false);
  const done = (id: string) => {
    if (latch.current) return;
    latch.current = true; setMarking(id);
    /* Marking is a flag: a repeat after a lost reply marks it again. */
    markChannelBookingDone(code, id)
      .catch((e: unknown) => onSaid(saidOf("Not marked", e)))
      .finally(() => { latch.current = false; setMarking(null); void cache.invalidateQueries({ queryKey: ["inventory", code, "channel-bookings"] }); });
  };
  const bookings = list.data?.bookings ?? [];
  return (
    <Box>
      <H2>Bookings from the booking sites</H2>
      <Note>Every booking SU has sent, as it arrived. A booking for a room that was no longer free is refused and the site is told there is nothing left; somebody then settles it with the site and the guest. Card details are never kept.</Note>
      {list.error ? <Text style={[t.caption, { color: c.red700 }]}>Could not read the bookings from SU: {list.error}</Text> : null}
      {list.data === undefined && !list.error ? <Loading words="Reading the bookings from SU…" /> : null}
      {list.data && bookings.length === 0 ? <Text style={[body, { color: c.grey600 }]}>SU has not sent a booking yet.</Text> : null}
      {bookings.map((b, i) => (
        <View key={b.id} style={{ gap: 4, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={[t.label, { color: c.ink900 }]}>{b.guestName ?? "-"}</Text>
            <Pill tone={OUTCOME[b.outcome].tone}>{OUTCOME[b.outcome].words}</Pill>
            {b.handled ? <Pill>Dealt with</Pill> : null}
          </View>
          <Text style={[t.label, t.tab, { color: c.grey500 }]}>
            {b.channel ?? "-"} · {b.arrival ?? "-"} to {b.departure ?? "-"} · {b.rooms} room{b.rooms === 1 ? "" : "s"} · {textRupees(b.total)}
          </Text>
          {b.reason ? <Text style={[t.label, { color: c.grey600 }]}>{b.reason}</Text> : null}
          <Text style={[t.label, { color: c.grey500 }]}>
            {whenOf(b.receivedAt)} · SU reference {b.suBookingId}{b.acknowledged ? " · SU told we have it" : " · SU not yet told"}{b.cardFieldsRemoved > 0 ? " · card details were not kept" : ""}
          </Text>
          {needsDealing(b) ? (
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              <Btn label={marking === b.id ? "Marking" : "I have dealt with this"} disabled={marking !== null} onPress={() => done(b.id)} />
            </View>
          ) : null}
        </View>
      ))}
    </Box>
  );
}
