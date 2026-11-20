import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, Check, DoorOpen, Gift, HandCoins, Lock, Percent, Plus, Receipt, Store, Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { ApiError, HeldError, outcomeUnknown, type Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { ON_THE_WEBSITE } from "../../core/menu";
import { useSession } from "../../core/session";
import { c, face, space, t } from "../../core/theme";
import { Screen, notKnown, useStuck } from "../../core/ui";
import {
  DENOMINATIONS, EXPENSE_CATEGORIES, MOVEMENTS, STEPS, approvalWords, badRow, closeBody, dayAt, hotelNameOf, mayRecord,
  methodWord, methodsByAmount, movementBody, movementOf, needsReason, precise, rowFigure, rupees, seedCounts, signed, stillUnknown, typed,
  variance, waitsOrRefused, whyNotClose, whyNotSave, type Counts, type DayEnd, type MovementKind, type Step,
} from "./dayEnd";
import { closeDay, countDrawer, openDay, readDayEnd, recordMovement } from "./serviceData";
import { BottomSheet, Btn, Empty, Field, Heading, Input, Line, Loading, PageHead, Panel, Pill, Select, Why } from "./ServiceKit";
import { whyNotCloseDay, whyNotReadDay } from "./serviceRoles";
import { ReadProblem, Refused, SaidBar, Stale, ty, useAccess, type Said } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   CLOSE RESTAURANT DAY on a phone — the web's /pos/:code/day-end
   (src/modules/pos/pages/DayEnd.tsx, 16 Nov; pictures pms-shots
   all/47-point-of-sale-close-restaurant-day = new/n-pos-day-end, the GM,
   31 Oct). Overview → Cash → Finalize, the steps never locking; Open the
   day only on an outlet's first-ever day.

   THE HIGHEST CARE, AS THE WEB GUARDS IT. Every figure is the server's
   (dayEnd.ts). Close is grey with the server's own reason until nothing
   is outstanding, the drawer is counted, a difference has its reason and
   the float kept is from ₹0 to the count; the phone's own dialog asks
   before it closes (docs/NATIVE.md). Every write is refused offline with
   the web's sentence (core offline.ts), latched at the tap (MEMORY 8).
   A lost reply (MEMORY 16): Record (a second POST is a second movement;
   the route reads no key) empties its amount, says "Not known whether it
   was recorded" and takes no more taps until its sheet is closed and the
   day read again; Close empties the float, says so, and stays grey until
   the day has been read again. Count and Open are safe to repeat (the
   count is replaced whole; a second open is refused).
   ══════════════════════════════════════════════════════════════════ */

const KEY = (code: string) => ["pos", code, "day-end"] as const;

const ICONS: Record<string, LucideIcon> = { expense: ArrowUpRight, top_up: ArrowDownLeft, withdrawal: Lock, due_collection: HandCoins };

function failed(title: string, e: unknown, done: string, where: string): Said {
  if (e instanceof HeldError) return { tone: "held", title: "Saved on this phone", body: e.message };
  if (outcomeUnknown(e)) { const n = notKnown(done, where, e); return { tone: "bad", title: n.title, body: n.body }; }
  return { tone: "bad", title, body: e instanceof Error ? e.message : String(e) };
}

export function DayEndScreen({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const { who } = useSession();
  /* The page's OWN hotel by name (D17-20): never the last one in view. */
  const hotelName = hotelNameOf(who?.hotels ?? [], code);
  const cache = useQueryClient();
  const access = useAccess(code);
  const refusedRead = whyNotReadDay(role);
  const [step, setStep] = useState<Step>("overview");
  const [pulled, setPulled] = useState(false);
  /* A Record whose reply was lost: the moment, kept here so no fresh sheet forgets it (MPOS-S4). */
  const [movementLost, setMovementLost] = useState<number | null>(null);
  const q = useQuery({ queryKey: KEY(code), queryFn: () => readDayEnd(code), enabled: !refusedRead });
  const refresh = () => { void cache.invalidateQueries({ queryKey: ["pos", code] }); };
  const reload = () => { setPulled(true); void q.refetch(); };

  const head = (description?: string, pill?: ReactNode) => <PageHead title="Close restaurant day" description={description} pill={pill} />;

  if (refusedRead) return <Screen refreshing={false} onRefresh={() => {}}>{head()}<Refused title="The restaurant day is not available" reason={refusedRead} /></Screen>;
  if (access.data && !access.data.ok) {
    return <Screen refreshing={false} onRefresh={() => void access.refetch()}>{head()}<Refused store title="The point of sale is not open to you here" reason={access.data.reason} /></Screen>;
  }
  if (!q.data) {
    const noOutlet = q.error instanceof ApiError && q.error.status === 404;
    return (
      <Screen refreshing={pulled && q.isFetching} onRefresh={reload}>
        {head(q.isLoading ? "Loading…" : undefined)}
        {q.isLoading ? <Loading words="Loading the restaurant day…" />
          /* POS-4: a refusal, a fault and a missing outlet are three answers. */
          : noOutlet ? <Panel><Empty icon={Store} title="No outlet" line="This property has no restaurant configured." /></Panel>
            : <ReadProblem error={q.error} what="the restaurant day" onRetry={reload} />}
      </Screen>
    );
  }

  const d = q.data;
  const closedPill = d.closedAt
    ? <Pill tone="success" icon={<Lock size={12} color={c.success600} />}>{`Closed ${d.closedAt}${d.closedBy ? ` by ${d.closedBy}` : ""}`}</Pill>
    : undefined;
  return (
    <Screen refreshing={pulled && q.isFetching} onRefresh={reload}>
      {head(`${hotelName} · ${d.outlet.name} · ${dateLong(d.businessDate)}`, closedPill)}
      {/* The figures stay on screen when a refresh fails - but a cashier about to close must know. */}
      {q.error ? <Stale error={q.error} loadedAt={q.dataUpdatedAt} onRetry={reload} /> : null}
      {!d.opened && !d.closedAt ? <OpenDay code={code} role={role} onDone={refresh} /> : null}
      <Steps current={step} onPick={setStep} blockers={d.blockers.length} />
      {step === "overview" ? <Overview day={d} /> : null}
      {step === "cash" ? <CashStep key={`${d.businessDate}-${d.cash.counted}`} code={code} role={role} day={d} onDone={refresh}
        loadedAt={q.dataUpdatedAt} movementLost={movementLost} onMovementLost={setMovementLost} /> : null}
      {step === "finalize" ? (
        <Finalize code={code} role={role} hotelName={hotelName} day={d} loadedAt={q.dataUpdatedAt} onDone={refresh}
          onBack={() => setStep("cash")} reread={() => void q.refetch()} />
      ) : null}
    </Screen>
  );
}

/* ── The three steps: tiles under a thumb, never locked ──────────────── */
function Steps({ current, onPick, blockers }: { current: Step; onPick: (s: Step) => void; blockers: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {STEPS.map((s, i) => {
        const on = s.id === current;
        return (
          <Pressable
            key={s.id} onPress={() => onPick(s.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={`${i + 1}. ${s.label}: ${s.hint}${s.id === "finalize" && blockers > 0 ? ". Something is outstanding" : ""}`}
            android_ripple={{ color: on ? c.ink800 : c.grey200 }}
            style={({ pressed }) => ({
              flex: 1, minHeight: 56, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, overflow: "hidden",
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: on ? c.ink900 : pressed && Platform.OS === "ios" ? c.grey50 : c.white, borderColor: on ? c.ink900 : c.grey300,
            })}
          >
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? "rgba(255,255,255,0.2)" : c.grey100 }}>
              <Text style={[ty.xs, face[600], { color: on ? c.white : c.grey600 }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[ty.md, face[500], { color: on ? c.white : c.ink900 }]}>
                {s.label}{s.id === "finalize" && blockers > 0 ? <Text style={{ color: c.tangerine }}>{" ·"}</Text> : null}
              </Text>
              <Text numberOfLines={1} style={[ty.xs, face[500], { color: on ? c.onNavy : c.grey500 }]}>{s.hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Step one: what the shift did ────────────────────────────────────── */
function Tile({ icon: Icon, label, value, note, warn }: { icon: LucideIcon; label: string; value: string; note: string; warn?: boolean }) {
  return (
    <Panel>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: warn ? c.yellow50 : c.grey100, borderWidth: warn ? 1 : 0, borderColor: c.yellow100 }}>
            <Icon size={16} color={warn ? c.yellow800 : c.grey600} />
          </View>
          <Text style={[t.label, ty.md, { color: c.grey600 }]}>{label}</Text>
        </View>
        <Text style={[t.lead, { fontSize: 26, color: warn ? c.yellow800 : c.ink900 }]} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1}>{value}</Text>
        <Text style={[t.caption, ty.sm]}>{note}</Text>
      </View>
    </Panel>
  );
}

function Rows<T>({ rows, render }: { rows: readonly T[]; render: (r: T, i: number) => ReactNode }) {
  return <View>{rows.map((r, i) => <View key={i} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey200 }}>{render(r, i)}</View>)}</View>;
}

function Entry({ main, sub, figure, subTone }: { main: string; sub?: string; figure?: string; subTone?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, ty.md, { color: c.ink900 }]}>{main}</Text>
        {sub ? <Text style={[t.label, ty.sm, { color: subTone ?? c.grey500 }]}>{sub}</Text> : null}
      </View>
      {figure ? <Text style={[t.label, t.tab, ty.md, { color: c.ink900 }]}>{figure}</Text> : null}
    </View>
  );
}

function Overview({ day }: { day: DayEnd }) {
  const s = day.summary;
  const nc = day.noCharge ?? [];
  const methods = methodsByAmount(s.byMethod);
  const where = (orderNo: string, table: string | null) => `${orderNo}${table ? ` · ${table}` : ""}`;
  return (
    <View style={{ gap: space.card }}>
      <Tile icon={Receipt} label="Settled" value={rupees(s.settledValue)} note={`${s.settledOrders} ${s.settledOrders === 1 ? "bill" : "bills"}`} />
      {/* Every one carries a reason; the total is what walked out of the door. */}
      <Tile icon={DoorOpen} label="Walked out" value={rupees(s.abandonedValue)} note={`${s.abandonedOrders} abandoned`} warn={s.abandonedOrders > 0} />
      <Tile icon={Percent} label="Discount given" value={rupees(s.discountGiven)} note="Off the settled bills" />
      {/* The NC bills given free (D27-365): their count; their values are the server's rows below, never added up here. */}
      <Tile icon={Gift} label="Complimentary" value={String(nc.length)} note={`${nc.length === 1 ? "NC bill" : "NC bills"}, not in sales`} />

      <Panel head={<Heading title="How the money arrived" />}>
        {methods.length === 0 ? <Text style={[t.label, ty.md, { color: c.grey500 }]}>Nothing has been settled yet today.</Text> : (
          <View style={{ marginTop: -10 }}>{methods.map(([m, amount]) => <Line key={m} label={methodWord(m)} value={rupees(amount)} />)}</View>
        )}
        <Text style={[t.label, ty.sm, { color: c.grey500, marginTop: 12 }]}>
          Only cash reaches the drawer. A card settlement and a bill charged to a room are business done - they are not in the tin.
          {s.byMethod["function"] !== undefined ? " Nor is an order settled to a banquet function: the host pays for it on the function's bill." : ""}
        </Text>
      </Panel>

      {(day.serviceCharge?.bills ?? 0) > 0 || (day.tips?.total ?? 0) > 0 ? (
        <Panel head={<Heading title="Service charge and tips" under="The service charge the guests agreed to is in the money above, with its GST. Tips are the staff's: not a sale, not taxed, and a cash tip is in the tin." />}>
          <View style={{ marginTop: -10 }}>
            <Line label={`Service charge (voluntary), ${day.serviceCharge?.bills ?? 0} ${(day.serviceCharge?.bills ?? 0) === 1 ? "bill" : "bills"}`} value={precise(day.serviceCharge?.amount ?? null)} />
            {(["cash", "card", "upi"] as const).filter((m) => (day.tips?.[m] ?? 0) > 0).map((m) => (
              <Line key={m} label={`Tips by ${methodWord(m)}`} value={precise(day.tips![m])} />
            ))}
            <Line strong label="Tips for the staff (not in sales)" value={precise(day.tips?.total ?? null)} />
          </View>
        </Panel>
      ) : null}

      {(day.voided ?? []).length > 0 ? (
        <Panel head={<Heading title="Paid bills voided" under="Not in the sales above. Their cash went back to the guest out of this tin, so it is not in Expected either." />}>
          <Rows rows={day.voided!} render={(v) => (
            <Entry main={`${where(v.orderNo, v.table)} - ${v.reason}`}
              sub={`${v.by ?? "-"} · ${v.at} · ${methodWord(v.method)}${v.reference ? ` · refund reference ${v.reference}` : ""}`} figure={precise(v.amount)} />
          )} />
        </Panel>
      ) : null}

      {nc.length > 0 ? (
        <Panel head={<Heading title="No charge (NC)" under="Bills given free, at their menu prices. Not in the sales above, nor in the tax or the money taken." />}>
          <Rows rows={nc} render={(v) => <Entry main={`${where(v.orderNo, v.table)} - ${v.reason}`} sub={`Approved by ${v.by ?? "-"} · ${v.at}`} figure={precise(v.value)} />} />
        </Panel>
      ) : null}

      {(day.modeChanges ?? []).length > 0 ? (
        <Panel head={<Heading title="Payment mode changed" under="Paid bills changed between cash, card and UPI. The cash above already counts them as changed." />}>
          <Rows rows={day.modeChanges!} render={(m) => (
            <Entry main={`${where(m.orderNo, m.table)} - ${m.from} to ${m.to}, ${precise(m.amount)}`}
              sub={`${m.reason} · ${m.by ?? "-"} · ${m.at}${m.afterDayEnd ? " · after the drawer was counted" : ""}`} />
          )} />
        </Panel>
      ) : null}

      {(day.struck ?? []).length > 0 ? (
        <Panel head={<Heading title="Struck after it reached the kitchen" />}>
          <Rows rows={day.struck!} render={(x) => (
            <Entry main={`${x.qty} × ${x.name} - ${x.reason ?? "-"}`} sub={`${where(x.orderNo, x.table)} · ${x.by ?? "-"} · ${x.at}`} figure={rupees(x.value)} />
          )} />
        </Panel>
      ) : null}
    </View>
  );
}

/* ── Notes and coins (NoteGrid): the float at Open the day, the tin at the count ── */
function NoteGrid({ counts, onChange, disabled }: { counts: Counts; onChange: (c: Counts) => void; disabled?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {DENOMINATIONS.map((value) => {
        const fig = rowFigure(value, counts[value]);
        return (
          <View key={value} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={[ty.md, face[500], t.tab, { width: 52, color: c.ink900 }]}>₹{value}</Text>
            <Text style={[ty.md, { color: c.grey500 }]}>×</Text>
            <Input
              value={counts[value] ?? ""} editable={!disabled} placeholder="0" keyboardType="number-pad" inputMode="numeric" maxLength={6}
              onChangeText={(v) => onChange({ ...counts, [value]: v })} accessibilityLabel={`Number of ₹${value} notes`}
              style={{ width: 96, minHeight: 48, fontSize: 18, ...t.tab }}
            />
            {/* A dash, not a zero. Nobody counted zero here. */}
            <Text style={[ty.md, face[500], t.tab, { marginLeft: "auto", color: c.grey600 }]}>{fig === null ? "-" : rupees(fig)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** One write per tap (MEMORY 8): latched before the first await, its words after. */
function useWrite() {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  async function run(go: () => Promise<Said>, fail: (e: unknown) => Said, after?: (e: unknown | null) => void) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      setSaid(await go());
      after?.(null);
    } catch (e) {
      setSaid(fail(e));
      after?.(e);
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  return { busy, said, setSaid, run };
}

/* ── Open the day: an outlet's first-ever float, counted once (D27-200) ── */
function OpenDay({ code, role, onDone }: { code: string; role: string | null; onDone: () => void }) {
  const [counts, setCounts] = useState<Counts>({});
  const w = useWrite();
  const n = typed(counts);
  const why = whyNotCloseDay(role) ?? (n.bad !== null ? badRow(n.bad) : null);
  const open = () => void w.run(async () => {
    await openDay(code, n.total);
    onDone();
    return { tone: "ok", title: "Day open", body: `Starting with ${rupees(n.total)}.` };
  }, (e) => failed("Not opened", e, "opened", "this day"), () => onDone());
  return (
    <Panel head={<Heading title="Open the day" under="This outlet's first float, counted once - cash is taken after it. From then on each day opens by itself on the float the close keeps." />}>
      <View style={{ gap: 14 }}>
        <NoteGrid counts={counts} onChange={setCounts} />
        {/* Blank is not zero: Open waits until something is typed. */}
        <Btn primary tall icon={Wallet} busy={w.busy} disabled={!n.any || why !== null} onPress={open}
          label={n.any ? `Open the day - ${rupees(n.total)}` : "Count the float first"} />
        <Why>{why}</Why>
        {w.said ? <SaidBar said={w.said} onDone={() => w.setSaid(null)} /> : null}
      </View>
    </Panel>
  );
}

/* ── Step two: what is in the tin ────────────────────────────────────── */
function CashStep({ code, role, day, onDone, loadedAt, movementLost, onMovementLost }: {
  code: string; role: string | null; day: DayEnd; onDone: () => void; loadedAt: number; movementLost: number | null; onMovementLost: (at: number) => void;
}) {
  const closed = Boolean(day.closedAt);
  /* Seeded from the count that exists, so the grid shows what was saved. */
  const [counts, setCounts] = useState<Counts>(() => seedCounts(day.cash.denominations));
  const w = useWrite();
  const n = typed(counts);
  /* A blank grid is never a count of zero (MPOS-S3): Save waits for something typed, as Open does. */
  const why = whyNotCloseDay(role) ?? whyNotSave(day, n);
  const save = () => void w.run(async () => {
    await countDrawer(code, n.denominations);
    return { tone: "ok", title: "Count saved", body: `${rupees(n.total)} in the drawer.` };
  }, (e) => failed("Not saved", e, "saved", "the drawer's count"), () => onDone());
  const v = variance(day.cash.variance, day.cash.waiting ?? 0);

  return (
    <View style={{ gap: space.card }}>
      <Panel head={<Heading title="Count the drawer" under="Notes and coins, as they come out of the tin." />}>
        <View style={{ gap: 14 }}>
          <NoteGrid counts={counts} onChange={setCounts} disabled={closed} />
          {!closed ? (
            <>
              <Btn primary tall busy={w.busy} disabled={why !== null} onPress={save}
                label={!day.opened ? "Open the day first" : n.any ? `Save the count - ${rupees(n.total)}` : "Count the drawer first"} />
              <Why>{why}</Why>
            </>
          ) : null}
          {w.said ? <SaidBar said={w.said} onDone={() => w.setSaid(null)} /> : null}
        </View>
      </Panel>

      <Movements code={code} role={role} day={day} onDone={onDone} lost={stillUnknown(movementLost, loadedAt)} onLost={onMovementLost} />

      <Panel head={<Heading title="The sum" />}>
        {/* The server's figures, line by line; each movement its own row, never added up here. */}
        <View style={{ marginTop: -10 }}>
          <Line label="Opening float" value={day.opened ? rupees(day.cash.opening) : "-"} />
          {/* A summary that holds no cash is a real nothing taken: the day was read. */}
          <Line label="Cash taken" value={rupees(day.summary.byMethod["cash"] ?? 0)} />
          {(day.tips?.cash ?? 0) > 0 ? <Line label="Cash tips" value={rupees(day.tips!.cash)} /> : null}
          {day.movements.filter((m) => !waitsOrRefused(m)).map((m) => {
            const spec = movementOf(m.kind);
            return <Line key={m.id} label={`${spec?.label ?? m.kind} · ${m.reason}`} value={signed(spec?.sign, m.amount)} />;
          })}
          {(day.cash.waiting ?? 0) > 0 ? <Line label="Paid out, waiting for a yes" value={rupees(day.cash.waiting!)} tone={c.yellow800} /> : null}
          <Line strong label="Expected" value={precise(day.cash.expected)} />
          {/* The count as saved: the server's, as the close will read it. */}
          <Line strong label="Counted" value={day.cash.counted === null ? "-" : precise(day.cash.counted)} />
        </View>
        <VarianceBox v={v} />
      </Panel>
    </View>
  );
}

function VarianceBox({ v }: { v: ReturnType<typeof variance> }) {
  if (!v.counted) {
    return <Text style={[t.label, ty.md, { marginTop: 14, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: 16, paddingVertical: 12, color: c.grey600 }]}>Nothing counted yet.</Text>;
  }
  return (
    <View accessibilityRole="alert" style={{ marginTop: 14, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 4,
      backgroundColor: v.balanced ? c.success50 : c.yellow50, borderColor: v.balanced ? c.success : c.yellow }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {v.balanced ? <Check size={16} color={c.success} /> : <AlertTriangle size={16} color={c.yellow800} />}
        <Text style={[ty.md, face[500], { color: c.ink900 }]}>{v.balanced ? "The drawer balances" : `${v.over ? "Over" : "Short"} by ${precise(v.by)}`}</Text>
      </View>
      {v.waitingPart !== null ? <Text style={[t.label, ty.sm]}>{precise(v.waitingPart)} of it is paid out and waiting for a yes.</Text> : null}
      {!v.balanced ? <Text style={[t.label, ty.sm]}>This does not stop the close. It has to be written down.</Text> : null}
    </View>
  );
}

/* ── Money in and out that is not a sale ─────────────────────────────── */
function Movements({ code, role, day, onDone, lost, onLost }: {
  code: string; role: string | null; day: DayEnd; onDone: () => void; lost: boolean; onLost: (at: number) => void;
}) {
  const [open, setOpen] = useState(0);
  const [last, setLast] = useState<Said | null>(null);
  const closed = Boolean(day.closedAt);
  /* After a lost reply Record stays grey until the day has been read again (MEMORY 16, MPOS-S4). */
  const why = whyNotCloseDay(role) ?? (lost ? notKnown("recorded", "In and out of the drawer, read again").line : null);
  return (
    <Panel head={
      <Heading title="In and out of the drawer" under="Money that was not a sale."
        right={!closed ? <Btn label="Record" icon={Plus} disabled={why !== null} onPress={() => { setLast(null); setOpen((n) => n + 1); }} /> : undefined} />
    }>
      {!closed ? <View style={{ marginBottom: why ? 8 : 0 }}><Why>{why}</Why></View> : null}
      {day.movements.length === 0 ? <Text style={[t.label, ty.md, { color: c.grey500 }]}>Nothing has gone in or out of the drawer today.</Text> : (
        <Rows rows={day.movements} render={(m) => {
          const spec = movementOf(m.kind);
          const Icon = ICONS[m.kind] ?? Wallet;
          const told = approvalWords(m);
          return (
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <Icon size={16} color={spec?.sign === 1 ? c.success : c.grey500} style={{ marginTop: 4 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.label, ty.md, { color: c.ink900 }]}>{m.reason}</Text>
                <Text style={[t.label, ty.sm, { color: c.grey500 }]}>
                  {spec?.label ?? m.kind}{m.kind === "expense" ? ` · ${m.category ?? "-"}` : ""} · {m.recordedBy ?? "-"} · {m.at}
                </Text>
                {m.kind === "expense" ? (
                  <Text style={[t.label, ty.sm, { color: c.grey500 }]}>
                    {m.photo ? "Photo of the bill: attached." : "No photo of the bill."} Opening or adding it: {ON_THE_WEBSITE.toLowerCase()}.
                  </Text>
                ) : null}
                {told ? <Text style={[t.label, ty.sm, { color: m.approval === "rejected" ? c.red700 : c.yellow800 }]}>{told}</Text> : null}
              </View>
              <Text style={[t.label, t.tab, ty.md, { color: c.ink900, ...face[500] }]}>{signed(spec?.sign, m.amount)}</Text>
            </View>
          );
        }} />
      )}
      {last ? <SaidBar said={last} onDone={() => setLast(null)} style={{ marginTop: 10 }} /> : null}
      {/* A fresh sheet each time it opens: a stuck Record is let go only by closing it. */}
      {open > 0 ? <MovementSheet key={open} code={code} onLost={onLost} onClose={(said) => { setOpen(0); setLast(said ?? null); onDone(); }} /> : null}
    </Panel>
  );
}

function MovementSheet({ code, onClose, onLost }: { code: string; onClose: (said?: Said) => void; onLost: (at: number) => void }) {
  const [kind, setKind] = useState<MovementKind>("expense");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const w = useWrite();
  const stuck = useStuck();
  const chosen = MOVEMENTS.find((m) => m.kind === kind)!;
  const expense = kind === "expense";
  const unknown = notKnown("recorded", "In and out of the drawer");
  const record = () => {
    if (stuck.isStuck()) return;
    const sent = movementBody(kind, amount, reason, category);
    void w.run(async () => {
      await recordMovement(code, sent);
      const said: Said = { tone: "ok", title: "Recorded", body: `${chosen.label} - ${rupees(sent.amount)}` };
      setTimeout(() => onClose(said), 0);
      return said;
    }, (e) => {
      /* A lost reply: the amount goes, and no more taps until the sheet is closed and the day read again (MEMORY 16). */
      if (stuck.stop(e)) { setAmount(""); onLost(Date.now()); return failed("Not recorded", e, "recorded", "In and out of the drawer"); }
      return failed("Not recorded", e, "recorded", "In and out of the drawer");
    });
  };
  const off = !mayRecord(kind, amount, reason, category);
  return (
    <BottomSheet open onClose={() => { if (!w.busy) onClose(); }} title="Money in or out"
      footer={
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" style={{ flex: 1 }} tall disabled={w.busy} onPress={() => onClose()} />
            <Btn primary label="Record" style={{ flex: 1 }} tall busy={w.busy} disabled={off || stuck.stuck} onPress={record} />
          </View>
          {stuck.stuck ? <Why>{unknown.line}</Why> : null}
        </>
      }>
      <Field label="What happened" hint={chosen.hint}>
        <Select label="What happened" value={kind} onChange={(v) => setKind(v as MovementKind)} options={MOVEMENTS.map((m) => ({ value: m.kind, label: m.label }))} />
      </Field>
      <Field label="How much">
        <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" inputMode="decimal" accessibilityLabel="How much" style={{ minHeight: 48, fontSize: 18, ...t.tab }} />
      </Field>
      {/* Always: an unexplained hundred rupees out of a till is what a day end exists to surface. */}
      <Field label="What was it for" hint="This is the line somebody asks about tomorrow.">
        <Input value={reason} onChangeText={setReason} multiline accessibilityLabel="What was it for" style={{ minHeight: 64, paddingTop: 10, textAlignVertical: "top" }} />
      </Field>
      {expense ? (
        <>
          <Field label="Category">
            <Select label="Category" value={category} onChange={setCategory}
              options={[{ value: "", label: "Choose one" }, ...EXPENSE_CATEGORIES.map((x) => ({ value: x, label: x }))]} />
          </Field>
          {/* The camera or a file needs expo-image-picker (~57.0.20), not approved. */}
          <Field label="Photo of the bill" hint={`${ON_THE_WEBSITE}. It can be added there later.`}>
            <Btn label="Take or pick a photo" disabled onPress={() => {}} />
          </Field>
        </>
      ) : null}
      {w.said ? <SaidBar said={w.said} onDone={() => w.setSaid(null)} /> : null}
    </BottomSheet>
  );
}

/* ── Step three: close it ────────────────────────────────────────────── */
function Finalize({ code, role, hotelName, day, loadedAt, onDone, onBack, reread }: {
  code: string; role: string | null; hotelName: string; day: DayEnd; loadedAt: number; onDone: () => void; onBack: () => void; reread: () => void;
}) {
  const [why, setWhy] = useState(day.cash.varianceReason ?? "");
  const [keptText, setKept] = useState("");
  const w = useWrite();
  /* A lost reply: grey until the day has been read again after it (MEMORY 16). */
  const [stuckAt, setStuckAt] = useState<number | null>(null);
  const stuck = stillUnknown(stuckAt, loadedAt);
  const label = dayAt(dateLong(day.businessDate), hotelName);

  if (day.closedAt) {
    return (
      <Panel>
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
          <Lock size={32} color={c.success} />
          <Text style={[t.heading, ty.md, { textAlign: "center" }]}>{label} is closed</Text>
          <Text style={[t.label, ty.md, { textAlign: "center" }]}>{day.closedAt}{day.closedBy ? ` by ${day.closedBy}` : ""}</Text>
          {day.cash.varianceReason ? <Text style={[t.label, ty.md, { textAlign: "center" }]}>“{day.cash.varianceReason}”</Text> : null}
          <Text style={[t.caption, ty.sm, { textAlign: "center", marginTop: 8 }]}>A correction is a movement on today, not an edit of yesterday.</Text>
        </View>
        {w.said ? <SaidBar said={w.said} onDone={() => w.setSaid(null)} /> : null}
      </Panel>
    );
  }

  const asksWhy = needsReason(day.cash);
  const blocked = whyNotCloseDay(role) ?? whyNotClose(day, why, keptText, precise);
  const v = variance(day.cash.variance, day.cash.waiting ?? 0);
  const close = () => {
    const sent = closeBody(why, keptText);
    void w.run(async () => {
      await closeDay(code, sent);
      return { tone: "ok", title: "Day closed", body: `${label} is finalised.` };
    }, (e) => {
      if (outcomeUnknown(e)) { setKept(""); setStuckAt(Date.now()); reread(); }
      return failed("Not closed", e, "closed", "this day, read again");
    }, () => onDone());
  };
  /* The phone's own dialog before the act that cannot be undone (docs/NATIVE.md). */
  const ask = () => {
    /* Alert.alert's buttons do nothing on react-native-web: the PC preview asks the browser's own way. */
    if (Platform.OS === "web") {
      const confirm = (globalThis as { confirm?: (m: string) => boolean }).confirm;
      if (confirm?.(`Close ${label}?\n\nA closed day cannot be edited.`)) close();
      return;
    }
    Alert.alert(`Close ${label}?`, "A closed day cannot be edited.", [
      { text: "Cancel", style: "cancel" },
      { text: "Close the day", style: "destructive", onPress: close },
    ]);
  };

  return (
    <View style={{ gap: space.card }}>
      <Panel head={<Heading title="Before it closes" under="Only what a person has to decide." />}>
        {day.blockers.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Check size={16} color={c.success} />
            <Text style={[t.label, ty.md, { color: c.ink900 }]}>Nothing is outstanding.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {day.blockers.map((b) => (
              <View key={b.id} style={{ borderRadius: 10, borderWidth: 1, borderColor: c.yellow, backgroundColor: c.yellow50, paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={16} color={c.yellow800} style={{ marginTop: 3 }} />
                  <Text style={[t.label, ty.md, { flex: 1, color: c.ink900 }]}>{b.reason}</Text>
                </View>
                {/* Named, so nobody hunts the floor for it. */}
                {b.detail ? <Text style={[ty.md, face[500], t.tab, { paddingLeft: 24, color: c.ink900 }]}>{b.detail}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </Panel>

      <Panel head={<Heading title="The drawer" />}>
        <View style={{ marginTop: -10 }}>
          <Line label="Expected" value={rupees(day.cash.expected)} />
          <Line label="Counted" value={day.cash.counted === null ? "-" : rupees(day.cash.counted)} />
        </View>
        <VarianceBox v={v} />
        <View style={{ gap: 14, marginTop: 14 }}>
          {asksWhy ? (
            <Field label="Why" hint="What a manager needs tomorrow is the sentence, not the number.">
              <Input value={why} onChangeText={setWhy} multiline accessibilityLabel="Why" style={{ minHeight: 80, paddingTop: 10, textAlignVertical: "top" }} />
            </Field>
          ) : null}
          {day.cash.counted !== null ? (
            /* D27-191: typed at every close; the rest of the count is deposited. Blank is not zero. */
            <Field label="Float kept for the next day" hint={`From ₹0 to the ${precise(day.cash.counted)} counted. The rest is deposited.`}>
              <Input value={keptText} onChangeText={setKept} keyboardType="decimal-pad" inputMode="decimal" accessibilityLabel="Float kept for the next day" style={{ minHeight: 48, fontSize: 18, ...t.tab }} />
            </Field>
          ) : (
            <Text style={[t.label, ty.md]}>
              The drawer has not been counted.{" "}
              <Text onPress={onBack} accessibilityRole="link" style={{ color: c.orange700, ...face[500] }}>Count it</Text> first.
            </Text>
          )}
          <Pressable
            onPress={blocked || stuck || w.busy ? undefined : ask} disabled={Boolean(blocked) || stuck || w.busy}
            accessibilityRole="button" accessibilityLabel={w.busy ? "Closing" : `Close ${label}`} accessibilityHint={blocked ?? undefined}
            accessibilityState={{ disabled: Boolean(blocked) || stuck, busy: w.busy }} android_ripple={{ color: c.orange700 }}
            style={({ pressed }) => ({
              minHeight: 56, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8, overflow: "hidden",
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
              backgroundColor: blocked || stuck ? c.grey300 : pressed && Platform.OS === "ios" ? c.orange700 : c.orange600,
            })}
          >
            <Banknote size={16} color={blocked || stuck ? c.grey600 : c.white} />
            {/* TWO LINES, the day and then the hotel (D17-20). */}
            {w.busy ? <Text style={[ty.md, face[600], { color: c.white }]}>Closing…</Text> : (
              <View style={{ flexShrink: 1 }}>
                <Text style={[ty.md, face[600], { color: blocked || stuck ? c.grey600 : c.white }]}>Close {dateLong(day.businessDate)}</Text>
                <Text style={[ty.md, face[600], { color: blocked || stuck ? c.grey600 : c.white }]}>{hotelName}</Text>
              </View>
            )}
          </Pressable>
          <Why>{stuck ? notKnown("closed", "this day, read again").line : blocked}</Why>
          <Text style={[t.caption, ty.sm, { textAlign: "center" }]}>A closed day cannot be edited.</Text>
          {w.said ? <SaidBar said={w.said} onDone={() => w.setSaid(null)} /> : null}
        </View>
      </Panel>
    </View>
  );
}
