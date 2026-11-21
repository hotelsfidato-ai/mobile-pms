import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { TimeField } from "../../core/DateField";
import { useSession } from "../../core/session";
import { c, face, t } from "../../core/theme";
import { notKnown, ripple, s as core, shade, useRead } from "../../core/ui";
import { Btn, Choose, Failed, Field, Labelled, Loading, Segmented, Sheet, Stale, SwitchRow, body, saidOf, useSaid, type Said } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import {
  ADVANCE, DAYS, FIELDS, IDS, TITLES, UNKNOWN_LINE, charge, pageName, hoursBody, hoursProblem, ruleFigures, rulesBody,
  toggleDay, whyNotAuditTime, withField, type DeskRules, type FrontDeskHours,
} from "./listsRules";
import { readHours, saveDeskSettings, saveFrontDesk } from "./listsData";
import { useDesk } from "./Lists";
import { Page, Section, Why, type usePageWrite, whyNotChange } from "./listsKit";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS › FRONT DESK on a phone (lane m13-set-lists) — the web's two
   pages in the console's Front desk group. They are NOT one screen under
   two addresses: they share one card, and each has its own.

   - Times and rules (/settings/front-desk/times-and-rules; the admin
     console's stand-in FrontDeskSettings, console.settings.ts): the front
     desk's hours and charges (inventory/components/FrontDeskCard.tsx),
     then the front desk's rules card (front-desk/components/
     FrontDeskRules.tsx);
   - Front desk rules (/settings/front-desk/front-desk; front-desk/
     settings/FrontDeskPage.tsx, desk.settings.ts): the same rules card,
     then how a booking starts, what it must carry, the housekeeping
     switches, the tax invoice at check-out, the restaurant's round-off and
     how the figures count - each saved at once, as on the web.

   Writes: PATCH /front-desk (the rules card, the hours) and PATCH
   /desk-settings (the sections), SETUP_CHANGE (owner, admin, GM); the
   night audit's opening time is the owner's and an administrator's (the
   route's own check): drawn read-only with its sentence for the GM. The
   hours are typed HH:MM (no time picker), checked with the route's words
   before they are sent. Refused offline with the web's sentence.
   Not pictured.
   ══════════════════════════════════════════════════════════════════ */

const HOURS_KEY = (code: string) => ["settings", code, "front-desk-hours"];

/* ── Front desk rules ─────────────────────────────────────────────── */

export function FrontDeskRulesScreen({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const desk = useDesk(code);
  const w = desk.w;
  const refusal = whyNotChange(role);
  const off = w.blocked || refusal !== null;
  const r = desk.read.data;
  /* Each control shows what it sent, grey, until the rules are read again (MSET-L1). */
  const save = (change: Partial<DeskRules>) => void w.run(desk.key, () => saveDeskSettings(code, change), {
    ok: () => desk.after(change), no: (e) => desk.say(saidOf(e, "Not saved")), unknown: desk.unknown,
  });
  return (
    <Page role={role} address="/settings/front-desk/front-desk" title="Front desk rules" eyebrow={hotel.name}
      explain="What the desk's screens start on and what they allow, at this hotel."
      refreshing={desk.refreshing} onRefresh={desk.pull} said={desk.said} onSaidClose={desk.close}>
      {desk.read.data === undefined ? (desk.read.error ? <Failed error={desk.read.error} onRetry={desk.read.reload} /> : <Loading what="the front desk's rules" />)
        : !r ? <Text style={[body, { color: c.grey500 }]}>The server sent no front desk settings for this property.</Text> : (
          <>
            <Stale error={desk.read.error} />
            <Why text={refusal} />
            <Why text={w.unknown ? UNKNOWN_LINE : null} tone="red" />
            <RulesCard code={code} rules={r} w={w} rulesKey={desk.key} off={off} onSaid={desk.say} onDone={desk.after} />

            <Section title="A new booking starts as" why="New booking opens on these; the desk can still change them on each booking.">
              <Grey off={off}><Segmented label="A new booking starts as" value={r.defaultGuarantee} onChange={(v) => { if (!off) save({ defaultGuarantee: v }); }}
                options={[{ value: "confirmed", label: "Confirmed" }, { value: "tentative", label: "Tentative" }] as const} /></Grey>
              <Grey off={off}><Segmented label="Billed to" value={r.defaultBillTo} onChange={(v) => { if (!off) save({ defaultBillTo: v }); }}
                options={[{ value: "guest", label: "Billed to the guest" }, { value: "company", label: "Billed to a company" }] as const} /></Grey>
            </Section>

            <Section title="A booking must carry" why="New booking will not save without these; a booking from a booking site is never held for them.">
              {FIELDS.map(([k, l]) => (
                <SwitchRow key={k} label={l} value={r.requiredBookingFields.includes(k)} disabled={off}
                  onChange={(on) => save({ requiredBookingFields: withField(r.requiredBookingFields, k, on) })} />
              ))}
            </Section>

            <Section title="Housekeeping" why="A room a guest leaves at check-out is always sent for cleaning. These decide the rest.">
              <SwitchRow label="A room a guest moved out of is sent for cleaning" value={r.hkDirtyAfterMove} disabled={off}
                onChange={(v) => save({ hkDirtyAfterMove: v })} />
              <SwitchRow label="A room back from a block is sent for cleaning" description="Off: it comes back as it was before the block."
                value={r.hkDirtyAfterUnblock} disabled={off} onChange={(v) => save({ hkDirtyAfterUnblock: v })} />
              <SwitchRow label="The night audit sends every room with a guest staying on for its daily clean" value={r.hkStayoverDirtyAtAudit} disabled={off}
                onChange={(v) => save({ hkStayoverDirtyAtAudit: v })} />
            </Section>

            <Section title="The tax invoice at check-out"
              why="What Check out does with the guest's tax invoice. Two copies print as ORIGINAL FOR RECIPIENT and DUPLICATE FOR SUPPLIER, as GST asks for a service's invoice.">
              <Choose label="The tax invoice at check-out" value={r.invoiceAtCheckout ?? "print"} disabled={off}
                onChange={(v) => save({ invoiceAtCheckout: v as DeskRules["invoiceAtCheckout"] })}
                choices={[
                  { value: "print", label: "Issue it and print it, by itself" },
                  { value: "offer", label: "Offer an Issue tax invoice button" },
                  { value: "invoices", label: "Nothing at check-out: issue it on Invoices" },
                ]} />
              <Grey off={off}><Segmented label="Copies" value={String(r.invoiceCopies ?? 2)} onChange={(v) => { if (!off) save({ invoiceCopies: Number(v) as 1 | 2 }); }}
                options={[{ value: "2", label: "2 copies" }, { value: "1", label: "1 copy" }]} /></Grey>
            </Section>

            <Section title="The restaurant's round-off"
              why="A restaurant bill paid in cash is always taken to the rupee, as the drawer counts rupees. Room bills and invoices are never rounded.">
              <Choose label="The restaurant's round-off" value={r.posRoundOff} disabled={off}
                onChange={(v) => save({ posRoundOff: v as DeskRules["posRoundOff"] })}
                choices={[
                  { value: "manual", label: "Manual: the Round off button" },
                  { value: "automatic", label: "Automatic: every bill paid there, to ₹1" },
                  { value: "off", label: "Off: no Round off button" },
                ]} />
            </Section>

            <Section title="How the figures count"
              why="Occupancy = rooms sold ÷ rooms available. ADR (average daily rate) = room revenue ÷ rooms sold. RevPAR = room revenue ÷ rooms available. Rooms available leave out rooms blocked that night.">
              <Text style={[body, { color: c.grey600 }]}>
                For example, 40 rooms available, 30 sold and ₹90,000 room revenue: occupancy 75%, ADR ₹3,000, RevPAR ₹2,250.
              </Text>
              <SwitchRow label="A complimentary room counts as sold" description="On, as the owner's eZee reports count it."
                value={r.kpiCompAsSold} disabled={off} onChange={(v) => save({ kpiCompAsSold: v })} />
              <SwitchRow label="A day use counts as half a room sold" description="Off: a day use is not a room sold; it has its own line."
                value={r.kpiDayUseHalf} disabled={off} onChange={(v) => save({ kpiDayUseHalf: v })} />
            </Section>
          </>
        )}
    </Page>
  );
}

/** A segmented control greyed and untappable while the page may not write (the kit's has no disabled). */
function Grey({ off, children }: { off: boolean; children: ReactNode }) {
  return <View pointerEvents={off ? "none" : "auto"} accessibilityState={{ disabled: off }} style={{ opacity: off ? 0.5 : 1 }}>{children}</View>;
}

/* ── Times and rules ──────────────────────────────────────────────── */

export function TimesAndRulesScreen({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const hoursKey = pageName(code, "front-desk-hours");
  const desk = useDesk(code, [hoursKey]);
  const w = desk.w;
  const hours = useRead(w.watch(hoursKey, () => readHours(code)), HOURS_KEY(code));
  const refusal = whyNotChange(role);
  const off = w.blocked || refusal !== null;
  const [pulled, setPulled] = useState(false);
  const pull = () => { setPulled(true); desk.read.reload(); hours.reload(); };
  const hoursDone = () => void cache.invalidateQueries({ queryKey: HOURS_KEY(code) });
  return (
    <Page role={role} address="/settings/front-desk/times-and-rules" title="Times and rules" eyebrow={hotel.name}
      refreshing={pulled && (desk.read.loading || hours.loading)} onRefresh={pull} said={desk.said} onSaidClose={desk.close}>
      <Why text={refusal} />
      <Why text={w.unknown ? UNKNOWN_LINE : null} tone="red" />
      {hours.data === undefined ? (hours.error ? <Failed error={hours.error} onRetry={hours.reload} /> : <Loading what="the front desk's hours" />) : (
        <>
          <Stale error={hours.error} />
          <HoursCard code={code} role={role} hours={hours.data} w={w} hoursKey={hoursKey} off={off} onSaid={desk.say}
            onDone={hoursDone} onUnknown={(e) => { desk.say({ ...notKnown("saved", "the front desk's hours", e), tone: "bad" }); hoursDone(); }} />
        </>
      )}
      {desk.read.data === undefined ? (desk.read.error ? <Failed error={desk.read.error} onRetry={desk.read.reload} /> : <Loading what="the front desk's rules" />) : (
        <>
          <Stale error={desk.read.error} />
          {/* MSET-L4: no rules from the server, no card - never the web's START sent back as if they were the hotel's. */}
          {desk.read.data === null ? <Text style={[body, { color: c.grey500 }]}>The server sent no front desk settings for this property.</Text>
            : <RulesCard code={code} rules={desk.read.data} w={w} rulesKey={desk.key} off={off} onSaid={desk.say} onDone={desk.after} />}
        </>
      )}
    </Page>
  );
}

/* ── The two cards ────────────────────────────────────────────────── */

type Writer = ReturnType<typeof usePageWrite>;

/** A card of labelled figures, two to a row, and its Edit (FrontDeskCard, FrontDeskRulesCard). */
function FigureCard({ figures, onEdit, off }: { figures: [string, string][]; onEdit: () => void; off: boolean }) {
  return (
    <View style={[core.card, { gap: 14 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
        {figures.map(([label, value]) => (
          <View key={label} style={{ width: "50%", paddingRight: 8 }}>
            <Labelled label={label}>
              <Text style={[t.heading, t.tab, { color: value === "-" ? c.grey500 : c.ink900 }]}>{value}</Text>
            </Labelled>
          </View>
        ))}
      </View>
      <View style={{ alignItems: "flex-start" }}><Btn label="Edit" onPress={onEdit} disabled={off} /></View>
    </View>
  );
}

/** The front desk's rules (FrontDeskRules.tsx): the figures, and the dialog as a sheet. */
function RulesCard({ code, rules, w, rulesKey, off, onSaid, onDone }: {
  code: string; rules: DeskRules; w: Writer; rulesKey: string; off: boolean; onSaid: (s: Said) => void; onDone: (change?: Partial<DeskRules>) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <FigureCard figures={ruleFigures(rules)} onEdit={() => setEditing(true)} off={off} />
      {editing ? (
        <RulesSheet current={rules} busy={w.busy} off={off} onClose={() => setEditing(false)}
          onSave={(r, fail) => void w.run(rulesKey, () => saveFrontDesk(code, rulesBody(r)), {
            ok: () => { setEditing(false); onSaid({ title: "Saved", tone: "ok" }); onDone(rulesBody(r)); },
            no: (e) => fail(saidOf(e, "Not saved")),
            unknown: (e) => { setEditing(false); onSaid({ ...notKnown("saved", "the front desk's rules", e), tone: "bad" }); onDone(); },
          })} />
      ) : null}
    </>
  );
}

function RulesSheet({ current, busy, off, onClose, onSave }: {
  current: DeskRules; busy: boolean; off: boolean; onClose: () => void; onSave: (r: DeskRules, fail: (s: Said) => void) => void;
}) {
  const [r, setR] = useState(current);
  const [said, setSaid] = useState<Said | null>(null);
  const set = (patch: Partial<DeskRules>) => setR((was) => ({ ...was, ...patch }));
  return (
    <Sheet open title="Front desk rules" description="What the desk's screens start on, and what they allow." onClose={onClose} closable={!busy}
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={busy} grow />
        <Btn label={busy ? "Saving…" : "Save"} variant="primary" disabled={off || busy} grow onPress={() => { setSaid(null); onSave(r, setSaid); }} />
      </>}>
      <Choose label="Advance before check-in" value={r.advanceBeforeCheckIn} disabled={busy}
        hint="Never asked of a company's booking, a room the group's host pays for, or a booking prepaid on a booking site."
        onChange={(v) => set({ advanceBeforeCheckIn: v as DeskRules["advanceBeforeCheckIn"] })}
        choices={ADVANCE.map(([value, label]) => ({ value, label }))} />
      <SwitchRow label="The desk may overbook" description="Off: a booking - or a group - past a full house is refused."
        value={r.deskMayOverbook} disabled={busy} onChange={(v) => set({ deskMayOverbook: v })} />
      <SwitchRow label="The GM may undo a check-in"
        description="And cancel or void a guest in house; the front desk asks the GM. Off: a guest who has arrived is checked out instead. The owner and an Admin always may."
        value={r.gmMayUndoCheckIn !== false} disabled={busy} onChange={(v) => set({ gmMayUndoCheckIn: v })} />
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.ink900, ...face[500] }]}>Weekend</Text>
        <Text style={[t.caption, { lineHeight: 17 }]}>Shaded on the Calendar and Rates. No price reads it.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {DAYS.map((d, i) => {
            const on = r.weekendDays.includes(i);
            return (
              <Pressable
                key={d} onPress={() => set({ weekendDays: toggleDay(r.weekendDays, i) })} disabled={busy} accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: busy }} accessibilityLabel={d} android_ripple={ripple}
                style={shade(({ pressed }) => ({
                  minWidth: 52, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden",
                  borderColor: on ? c.orange : c.grey200, backgroundColor: on ? c.orange50 : pressed ? c.grey50 : c.white,
                }))}
              >
                <Text style={[t.label, { color: on ? c.ink900 : c.grey600 }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Choose label="ID starts on" value={r.defaultIdType ?? ""} disabled={busy} hint="For a guest of the hotel's nationality."
        onChange={(v) => set({ defaultIdType: v || null })} choices={IDS.map(([value, label]) => ({ value, label }))} />
      <Field label="Nationality" value={r.defaultNationality} hint="Two letters, IN for India." maxLength={2} editable={!busy}
        onChangeText={(v) => set({ defaultNationality: v.toUpperCase() })} input={{ autoCapitalize: "characters", autoCorrect: false, autoComplete: "off" }} />
      <Choose label="Title" value={r.defaultTitle ?? ""} disabled={busy}
        onChange={(v) => set({ defaultTitle: v || null })} choices={TITLES.map((x) => ({ value: x, label: x || "None" }))} />
      {said ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{said.title}{said.body ? `: ${said.body}` : ""}</Text> : null}
    </Sheet>
  );
}

/** The front desk's hours (FrontDeskCard.tsx): the five figures, and the dialog as a sheet. */
function HoursCard({ code, role, hours, w, hoursKey, off, onSaid, onDone, onUnknown }: {
  code: string; role: AdminProps["role"]; hours: FrontDeskHours; w: Writer; hoursKey: string; off: boolean;
  onSaid: (s: Said) => void; onDone: () => void; onUnknown: (e: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <FigureCard off={off} onEdit={() => setEditing(true)} figures={[
        ["Rooms ready from", hours.checkInTime],
        ["Check-out by", hours.checkOutTime],
        /* A DASH, not a zero: "we do not charge for this" is a decision; zero is a price. */
        ["Early arrival", charge(hours.earlyCheckinCharge)],
        ["Late departure", charge(hours.lateCheckoutCharge)],
        ["Night audit opens", hours.nightAuditOpensAt],
      ]} />
      {editing ? (
        <HoursSheet current={hours} auditRefused={whyNotAuditTime(role)} busy={w.busy} off={off} onClose={() => setEditing(false)}
          onSave={(cin, cout, audit, fail) => void w.run(hoursKey, () => saveFrontDesk(code, hoursBody(hours, cin, cout, audit)), {
            ok: () => { setEditing(false); onSaid({ title: "Saved", tone: "ok" }); onDone(); },
            no: (e) => fail(saidOf(e, "Not saved")),
            unknown: (e) => { setEditing(false); onUnknown(e); },
          })} />
      ) : null}
    </>
  );
}

function HoursSheet({ current, auditRefused, busy, off, onClose, onSave }: {
  current: FrontDeskHours; auditRefused: string | null; busy: boolean; off: boolean; onClose: () => void;
  onSave: (cin: string, cout: string, audit: string, fail: (s: Said) => void) => void;
}) {
  const [cin, setCin] = useState(current.checkInTime);
  const [cout, setCout] = useState(current.checkOutTime);
  const [audit, setAudit] = useState(current.nightAuditOpensAt);
  const [said, setSaid] = useState<Said | null>(null);
  const submit = () => {
    setSaid(null);
    const wrong = hoursProblem(cin.trim(), cout.trim(), audit.trim());
    if (wrong) return setSaid({ title: "Not saved", body: wrong, tone: "bad" });
    onSave(cin.trim(), cout.trim(), audit.trim(), setSaid);
  };
  return (
    <Sheet open title="The front desk's hours" description="When rooms are ready, when they are due back, and what an exception costs." onClose={onClose} closable={!busy}
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={busy} grow />
        <Btn label={busy ? "Saving…" : "Save"} variant="primary" disabled={off || busy} grow onPress={submit} />
      </>}>
      {/* FrontDeskCard.tsx's three <input type="time">: each phone's own clock (TimeField, M-16), sent as "HH:MM". */}
      <TimeField label="Rooms ready from" required value={cin} onChange={setCin} disabled={busy} />
      <TimeField label="Check-out by" required value={cout} onChange={setCout} disabled={busy} />
      {/* D27-338: the owner's and an administrator's; anybody else sees it, and the route's words. */}
      <TimeField label="Night audit opens at" required value={audit} onChange={setAudit} disabled={busy || auditRefused !== null}
        hint={auditRefused ?? "Before this time, today's night audit cannot be run. A day already behind can always be closed. The owner or an administrator may change it."} />
      <Text style={[body, { color: c.grey600 }]}>The early arrival and late departure fees are set on Settings › Money › Extra charges.</Text>
      <Text style={[body, { color: c.grey500 }]}>
        A guest arriving before the first time, or leaving after the second, needs a reason and somebody to allow it. The charge reaches their folio unless it is waived, and the reason is kept either way.
      </Text>
      {said ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{said.title}{said.body ? `: ${said.body}` : ""}</Text> : null}
    </Sheet>
  );
}

