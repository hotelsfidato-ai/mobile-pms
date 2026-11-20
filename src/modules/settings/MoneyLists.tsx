import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { c, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { useSession } from "../../core/session";
import { Refused as NotYours } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { Btn, Failed, Field, Loading, Select, Sheet, SwitchLine, TextBox } from "../inventory/configKit";
import { Empty, InDialog, Segmented, Stale, Toast, body, type Said } from "../inventory/kit";
import { confirmAct } from "../../core/ui";
import {
  listAdd, listChange, listOrder, listRemove, makeDefaultMethod, readDiscounts, readExtraCharges, readPaymentMethods, setEarlyLateFees, stamped,
  type MoneyList,
} from "./moneyData";
import { Grey, ListCard, MoveButtons, OnOff, Why, WhyLine, refusedPage, useWriter, type Outcome, type Writer } from "./moneyKit";
import {
  COLUMNS, MONEY_READ, MONEY_SETTING, SETUP_CHANGE, chargeBody, chargeLine, chargesOf, discountBody, discountOff, discountProblem,
  discountReady, feeText, feesBody, feesChanged, isDefault, kindWords, methodReady, moved, typedFigure, whyNot, whyNotDefault,
  type Discount, type ExtraCharge, type ExtraChargesView, type PaymentMethodRow, type PaymentMethodsView,
} from "./moneyRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MONEY: PAYMENT METHODS, EXTRA CHARGES, PICKUP AND DROP, ROOM
   DISCOUNTS on a phone (lane m13-set-money, 20 Nov) — the web's
   /settings/money/<slug> (src/modules/finance/money.settings.ts; pages/
   money/PaymentMethods.tsx, ExtraCharges.tsx, Pickup.tsx, Discounts.tsx,
   MoneyList.tsx; the owner's D27-259, migration 191). Not pictured.

   Who: the pages are the console's (owner, administrator, GM: `setting`);
   the reads are see("setting"), every change MONEY_SETTING (room_config
   edit), the early and late fees SETUP_CHANGE (PATCH front-desk). A
   control the API would refuse is grey with its sentence.

   Each list: search, "+", per row On/Off, Edit, and Delete only when
   nothing used it (asked first - the web deletes at one tap). The web's
   drag to reorder is "Move up / Move down" in a row's editor (the whole
   order is sent, PUT …/order, as the web). Every figure the server's,
   paise kept; a price left blank is "Included, no charge", never ₹0.
   ══════════════════════════════════════════════════════════════════ */

/** What every page here does after a write: the toast, and a read of the page again (a read begun
    after an unknown outcome is what lifts it). */
function useAfter(key: readonly unknown[]) {
  const cache = useQueryClient();
  const [said, setSaid] = useState<Said | null>(null);
  const refresh = () => void cache.invalidateQueries({ queryKey: key });
  const after = (r: Outcome | null, ok: string) => {
    if (!r) return false;
    setSaid(r.ok ? { title: ok, tone: "ok" } : r.said);
    refresh();
    return r.ok;
  };
  return { said, setSaid, refresh, after };
}

/** The page's frame: refused, the four states, what was last read. */
function Frame({ title, under, refused, cannotRead, q, what, children, said, onSaid, sheets }: {
  title: string; under: string; refused: string | null; cannotRead: string | null;
  q: { data: unknown; error?: string; loading: boolean; reload: () => void }; what: string;
  children: ReactNode; said: Said | null; onSaid: () => void; sheets?: ReactNode;
}) {
  const [pulled, setPulled] = useState(false);
  let main: ReactNode;
  if (refused) main = <NotYours sentence={refused} />;
  else if (cannotRead) main = <Empty title={title} description={cannotRead} />;
  else if (q.data == null) {
    main = q.error ? <Failed title={`The ${what} did not load`} what={`The ${what}`} error={q.error} onRetry={q.reload} /> : <Loading words={`Reading the ${what}…`} />;
  } else main = <><Stale error={q.error} />{children}</>;
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title={title} under={under} />
        {main}
      </Screen>
      {sheets}
      <Toast said={said} onClose={onSaid} />
    </View>
  );
}

const askDelete = (name: string, onYes: () => void) =>
  confirmAct(`Delete ${name}?`, "It comes off the list. Only what nothing has used can be deleted; anything used is switched Off instead.", "Delete", onYes);

/** The sheet's foot: what came back, the grey line, Cancel and Save. */
function Foot({ said, grey, saveLabel = "Save", ready, busy, onCancel, onSave, extra }: {
  said: Said | null; grey: string | null; saveLabel?: string; ready: boolean; busy: boolean; onCancel: () => void; onSave: () => void; extra?: ReactNode;
}) {
  return (
    <>
      <InDialog said={said} />
      <Grey line={grey} />
      {extra}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow disabled={busy} onPress={onCancel} />
        <Btn label={busy ? "Saving…" : saveLabel} variant="primary" grow disabled={!ready || busy || grey !== null} onPress={onSave} />
      </View>
    </>
  );
}

/* ══ PAYMENT METHODS ══════════════════════════════════════════════ */

export function PaymentMethods({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const session = useSession();
  const refused = refusedPage(role, "/settings/money/payment-methods", "Payment methods");
  const cannotRead = refused ?? whyNot(MONEY_READ, role);
  const key = ["settings", code, "payment-methods"];
  const q = useRead(() => (cannotRead ? Promise.resolve(null) : stamped(() => readPaymentMethods(code))), key);
  const w = useWriter(`${code}/payment-methods`, q.data?.began);
  const cannot = whyNot(MONEY_SETTING, role);
  const { said, setSaid, after, refresh } = useAfter(key);
  const [editing, setEditing] = useState<PaymentMethodRow | "new" | null>(null);
  const v = q.data?.d;
  /* The desk's screens read the hotel's list from the session (PaymentMethods.tsx done): read it again. */
  const done = (r: Outcome | null, ok: string) => { const yes = after(r, ok); if (r) void session.refresh(); return yes; };
  const act = (fn: () => Promise<unknown>) => w.run(fn, { title: "Not saved", done: "saved", where: "the list" });

  return (
    <Frame title="Payment methods" under="How guests pay here: what the bill, New booking and a function's bill offer."
      refused={refused} cannotRead={cannotRead} q={q} what="payment methods" said={said} onSaid={() => setSaid(null)}
      sheets={v && editing ? (
        <MethodSheet code={code} v={v} row={editing === "new" ? null : editing} w={w}
          onClose={() => { if (!w.busy) { setEditing(null); refresh(); } }}
          onDone={(ok) => { setEditing(null); done({ ok: true }, ok); }} />
      ) : null}>
      {v ? (
        <View style={{ gap: 8 }}>
          <Grey line={w.blocked ?? cannot} />
          <ListCard rows={v.methods} name={(m) => m.label} empty="No payment methods yet." addLabel="Add a method" locked={Boolean(cannot || w.blocked || w.busy)}
            detail={(m) => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[t.label, { color: c.grey500 }]}>{kindWords(v, m.kind)}</Text>
                {isDefault(v, m) ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Star size={14} color={c.orange700} />
                    <Text style={[t.label, { color: c.orange700 }]}>Default</Text>
                  </View>
                ) : null}
              </View>
            )}
            onAdd={() => setEditing("new")} onEdit={setEditing}
            onToggle={async (m, on) => done(await act(() => listChange(code, "payment-methods", m.id, { isActive: on })), on ? `${m.label} is On` : `${m.label} is Off`)}
            onDelete={(m) => askDelete(m.label, async () => done(await act(() => listRemove(code, "payment-methods", m.id)), `${m.label} deleted`))} />
        </View>
      ) : null}
    </Frame>
  );
}

function MethodSheet({ code, v, row, w, onClose, onDone }: {
  code: string; v: PaymentMethodsView; row: PaymentMethodRow | null; w: Writer; onClose: () => void; onDone: (ok: string) => void;
}) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [kind, setKind] = useState(row?.kind ?? "");
  const [said, setSaid] = useState<Said | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const isDef = row !== null && isDefault(v, row);
  const ids = v.methods.map((m) => m.id);
  const grey = w.blocked ?? lost;
  const go = async (fn: () => Promise<unknown>, ok: string, done: string) => {
    setSaid(null);
    const r = await w.run(fn, { title: "Not saved", done, where: "the list" });
    if (!r) return;
    if (r.ok) onDone(ok);
    else { setSaid(r.said); if (r.unknown) setLost(`${r.said.title}: close this and look at the list before trying again.`); }
  };
  const save = () => {
    if (!methodReady(label, kind)) return;
    const b = { label: label.trim(), kind };
    void go(() => (row ? listChange(code, "payment-methods", row.id, b) : listAdd(code, "payment-methods", b)), "Saved", row ? "saved" : "added");
  };
  const defaultWhy = row ? whyNotDefault(row) : null;
  return (
    <Sheet title={row ? `Edit ${row.label}` : "Add a payment method"} onClose={onClose}
      foot={<Foot said={said} grey={grey} ready={methodReady(label, kind)} busy={w.busy} onCancel={onClose} onSave={save}
        extra={row && !isDef ? (
          <View style={{ gap: 4 }}>
            <Btn label="Make default" disabled={w.busy || grey !== null || defaultWhy !== null}
              onPress={() => void go(() => makeDefaultMethod(code, row.id), `${row.label} is the default`, "made the default")} />
            {defaultWhy ? <Text style={t.caption}>{defaultWhy}</Text> : null}
          </View>
        ) : null} />}>
      <Field label="Name"><TextBox label="Name" value={label} placeholder="Agoda" caps="words" onChangeText={setLabel} /></Field>
      <Field label="In the books">
        <Select label="In the books" value={kind} placeholder="Choose" onChange={setKind}
          options={Object.entries(v.kinds).map(([k, words]) => ({ value: k, label: words }))} />
      </Field>
      {isDef ? <Text style={[body, { color: c.grey600 }]}>The default: it stays On.</Text> : null}
      {row ? (
        <MoveButtons first={ids[0] === row.id} last={ids[ids.length - 1] === row.id} disabled={w.busy || grey !== null}
          onMove={(by) => { const order = moved(ids, row.id, by); if (order) void go(() => listOrder(code, "payment-methods", order), "Order saved", "moved"); }} />
      ) : null}
      <Why>
        <WhyLine bold="The name" text={'is what the bill and the receipt print: "Agoda", "GoMMT", "Paytm".'} />
        <WhyLine bold="In the books" text={'is where the reports count it. A booking site that collected the money is Bill to company: "Agoda ₹4,500" prints as Agoda and is owed by Agoda in the City ledger.'} />
      </Why>
    </Sheet>
  );
}

/* ══ EXTRA CHARGES, AND PICKUP AND DROP (the same list, ExtraCharges.tsx transport) ══ */

export function ExtraCharges(props: AdminProps) {
  return <Charges {...props} transport={false} />;
}
/** Pickup.tsx: the extra charges marked as a pickup or a drop. */
export function Pickup(props: AdminProps) {
  return <Charges {...props} transport />;
}

function Charges({ hotel, role, transport }: AdminProps & { transport: boolean }) {
  const code = hotel.code;
  const slug = transport ? "pickup" : "extra-charges";
  const title = transport ? "Pickup and drop" : "Extra charges";
  const refused = refusedPage(role, `/settings/money/${slug}`, title);
  const cannotRead = refused ?? whyNot(MONEY_READ, role);
  /* One read for both pages (the web's ["extra-charges", hotel]): one list behind them. */
  const key = ["settings", code, "extra-charges"];
  const q = useRead(() => (cannotRead ? Promise.resolve(null) : stamped(() => readExtraCharges(code))), key);
  const w = useWriter(`${code}/extra-charges`, q.data?.began);
  const cannot = whyNot(MONEY_SETTING, role);
  const { said, setSaid, after, refresh } = useAfter(key);
  const [editing, setEditing] = useState<ExtraCharge | "new" | null>(null);
  const v = q.data?.d;
  const rows = v ? chargesOf(v, transport) : [];
  const act = (fn: () => Promise<unknown>) => w.run(fn, { title: "Not saved", done: "saved", where: "the list" });

  return (
    <Frame title={title} refused={refused} cannotRead={cannotRead} q={q} what={transport ? "pickups and drops" : "extra charges"}
      under={transport ? "Airport, station and bus stand runs a booking may add, with the time in its note." : "What a booking may add, and the early check-in and late check-out fees."}
      said={said} onSaid={() => setSaid(null)}
      sheets={v && editing ? (
        <ChargeSheet code={code} all={v.charges} row={editing === "new" ? null : editing} transport={transport} w={w}
          onClose={() => { if (!w.busy) { setEditing(null); refresh(); } }}
          onDone={(ok) => { setEditing(null); after({ ok: true }, ok); }} />
      ) : null}>
      {v ? (
        <View style={{ gap: 12 }}>
          <Grey line={w.blocked ?? cannot} />
          {!transport ? <EarlyLate key={`${v.earlyCheckinCharge}/${v.lateCheckoutCharge}`} code={code} v={v} w={w} cannot={whyNot(SETUP_CHANGE, role)} onSaid={after} /> : null}
          <ListCard rows={rows} name={(x) => x.name} detail={chargeLine} locked={Boolean(cannot || w.blocked || w.busy)}
            addLabel={transport ? "Add a pickup or drop" : "Add a charge"} empty={transport ? "No pickup or drop yet." : "No extra charges yet."}
            onAdd={() => setEditing("new")} onEdit={setEditing}
            onToggle={async (x, on) => after(await act(() => listChange(code, "extra-charges", x.id, { isActive: on })), on ? `${x.name} is On` : `${x.name} is Off`)}
            onDelete={(x) => askDelete(x.name, async () => after(await act(() => listRemove(code, "extra-charges", x.id)), `${x.name} deleted`))} />
        </View>
      ) : null}
    </Frame>
  );
}

/** ExtraCharges.tsx EarlyLate: blank is "no fee", never ₹0 (063). */
function EarlyLate({ code, v, w, cannot, onSaid }: {
  code: string; v: ExtraChargesView; w: Writer; cannot: string | null; onSaid: (r: Outcome | null, ok: string) => boolean;
}) {
  const [e, setE] = useState(feeText(v.earlyCheckinCharge));
  const [l, setL] = useState(feeText(v.lateCheckoutCharge));
  const changed = feesChanged(e, l, v);
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
      <Field label="Early check-in fee" hint="Blank: no fee.">
        <TextBox label="Early check-in fee" value={e} keyboardType="decimal-pad" disabled={cannot !== null} onChangeText={(x) => setE(typedFigure(x))} />
      </Field>
      <Field label="Late check-out fee" hint="Blank: no fee.">
        <TextBox label="Late check-out fee" value={l} keyboardType="decimal-pad" disabled={cannot !== null} onChangeText={(x) => setL(typedFigure(x))} />
      </Field>
      {cannot ? <Text style={t.caption}>{cannot}</Text> : null}
      <View style={{ flexDirection: "row" }}>
        <Btn label={w.busy ? "Saving…" : "Save fees"} variant="primary" disabled={!changed || w.busy || cannot !== null || w.blocked !== null}
          onPress={async () => onSaid(await w.run(() => setEarlyLateFees(code, feesBody(e, l)), { title: "Not saved", done: "saved", where: "the fees" }), "Saved")} />
      </View>
    </View>
  );
}

function ChargeSheet({ code, all, row, transport, w, onClose, onDone }: {
  code: string; all: ExtraCharge[]; row: ExtraCharge | null; transport: boolean; w: Writer; onClose: () => void; onDone: (ok: string) => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [rate, setRate] = useState(row?.rate == null ? "" : String(row.rate));
  const [category, setCategory] = useState(row?.category ?? "misc");
  const [isTransport, setIsTransport] = useState(row?.isTransport ?? transport);
  const [said, setSaid] = useState<Said | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const grey = w.blocked ?? lost;
  /* The order is the whole list's (pickups and charges are one table, sort_order across both). */
  const ids = all.map((x) => x.id);
  const go = async (fn: () => Promise<unknown>, ok: string, done: string) => {
    setSaid(null);
    const r = await w.run(fn, { title: "Not saved", done, where: "the list" });
    if (!r) return;
    if (r.ok) onDone(ok);
    else { setSaid(r.said); if (r.unknown) setLost(`${r.said.title}: close this and look at the list before trying again.`); }
  };
  const save = () => {
    if (!name.trim()) return;
    const b = chargeBody(name, rate, category, isTransport);
    void go(() => (row ? listChange(code, "extra-charges", row.id, b) : listAdd(code, "extra-charges", b)), "Saved", row ? "saved" : "added");
  };
  /* Up and down among the rows this page shows, the whole order sent (MoneyList drops onto a shown row). */
  const shown = all.filter((x) => x.isTransport === transport).map((x) => x.id);
  const move = (by: -1 | 1) => {
    if (!row) return;
    const i = shown.indexOf(row.id);
    const other = shown[i + by];
    if (other === undefined) return;
    /* Place it where the neighbour shown on this page was. */
    const rest = ids.filter((id) => id !== row.id);
    rest.splice(rest.indexOf(other) + (by > 0 ? 1 : 0), 0, row.id);
    void go(() => listOrder(code, "extra-charges", rest), "Order saved", "moved");
  };
  return (
    <Sheet title={row ? `Edit ${row.name}` : transport ? "Add a pickup or drop" : "Add a charge"} onClose={onClose}
      foot={<Foot said={said} grey={grey} ready={name.trim() !== ""} busy={w.busy} onCancel={onClose} onSave={save} />}>
      <Field label="Name"><TextBox label="Name" value={name} caps="sentences" onChangeText={setName} /></Field>
      <Field label="Price" hint="Blank: included at no charge.">
        <TextBox label="Price" value={rate} keyboardType="decimal-pad" onChangeText={(x) => setRate(typedFigure(x))} />
      </Field>
      <Field label="Bill's column"><Select label="Bill's column" value={category} options={COLUMNS} onChange={setCategory} /></Field>
      <SwitchLine label="A pickup or a drop" on={isTransport} onChange={setIsTransport} />
      {row ? (
        <MoveButtons first={shown[0] === row.id} last={shown[shown.length - 1] === row.id} disabled={w.busy || grey !== null} onMove={move} />
      ) : null}
      <Why>
        <WhyLine bold="The price" text={'is what the desk adds to the bill: "Airport pickup ₹1,000". Leave it blank when the rate includes it at no charge - a welcome drink.'} />
        <WhyLine bold="The bill's column" text="is where the money lands in the reports: a cake under Food, a pickup under Other charges." />
      </Why>
    </Sheet>
  );
}

/* ══ ROOM DISCOUNTS ═══════════════════════════════════════════════ */

export function Discounts({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/money/discounts", "Room discounts");
  const cannotRead = refused ?? whyNot(MONEY_READ, role);
  const key = ["settings", code, "discounts"];
  const q = useRead(() => (cannotRead ? Promise.resolve(null) : stamped(() => readDiscounts(code))), key);
  const w = useWriter(`${code}/discounts`, q.data?.began);
  const cannot = whyNot(MONEY_SETTING, role);
  const { said, setSaid, after, refresh } = useAfter(key);
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const rows = q.data?.d.discounts;
  /* The booking form's own list of them is read again too (Discounts.tsx done). */
  const done = (r: Outcome | null, ok: string) => { const yes = after(r, ok); if (r) void cache.invalidateQueries({ predicate: (x) => x.queryKey.includes("room-promotions") }); return yes; };
  const act = (fn: () => Promise<unknown>) => w.run(fn, { title: "Not saved", done: "saved", where: "the list" });
  return (
    <Frame title="Room discounts" refused={refused} cannotRead={cannotRead} q={q} what="room discounts" said={said} onSaid={() => setSaid(null)}
      under="Named discounts on rooms for New booking: a percentage or rupees off each night. The restaurant's discounts are Promotions, in Point of sale → Menu."
      sheets={rows && editing ? (
        <DiscountSheet code={code} row={editing === "new" ? null : editing} w={w}
          onClose={() => { if (!w.busy) { setEditing(null); refresh(); } }}
          onDone={(ok) => { setEditing(null); done({ ok: true }, ok); }} />
      ) : null}>
      {rows ? (
        <View style={{ gap: 8 }}>
          <Grey line={w.blocked ?? cannot} />
          <ListCard rows={rows} name={(d) => d.name} detail={discountOff} addLabel="Add a discount" empty="No named discounts yet."
            locked={Boolean(cannot || w.blocked || w.busy)} onAdd={() => setEditing("new")} onEdit={setEditing}
            onToggle={async (d, on) => done(await act(() => listChange(code, "discounts", d.id, { isActive: on })), on ? `${d.name} is On` : `${d.name} is Off`)}
            onDelete={(d) => askDelete(d.name, async () => done(await act(() => listRemove(code, "discounts", d.id)), `${d.name} deleted`))} />
        </View>
      ) : null}
    </Frame>
  );
}

function DiscountSheet({ code, row, w, onClose, onDone }: { code: string; row: Discount | null; w: Writer; onClose: () => void; onDone: (ok: string) => void }) {
  const [name, setName] = useState(row?.name ?? "");
  const [by, setBy] = useState<"percent" | "amount">(row?.amount != null ? "amount" : "percent");
  const [value, setValue] = useState(String(row?.percent ?? row?.amount ?? ""));
  const [said, setSaid] = useState<Said | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const grey = w.blocked ?? lost;
  const problem = discountProblem(by, value);
  const save = async () => {
    if (!discountReady(name, by, value)) return;
    setSaid(null);
    const b = discountBody(name, by, value);
    const r = await w.run(() => (row ? listChange(code, "discounts", row.id, b) : listAdd(code, "discounts", b)), { title: "Not saved", done: row ? "saved" : "added", where: "the list" });
    if (!r) return;
    if (r.ok) onDone("Saved");
    else { setSaid(r.said); if (r.unknown) setLost(`${r.said.title}: close this and look at the list before trying again.`); }
  };
  return (
    <Sheet title={row ? `Edit ${row.name}` : "Add a discount"} onClose={onClose}
      foot={<Foot said={said} grey={grey} ready={discountReady(name, by, value)} busy={w.busy} onCancel={onClose} onSave={() => void save()} />}>
      <Field label="Name"><TextBox label="Name" value={name} caps="words" onChangeText={setName} /></Field>
      <Segmented label="Percent or rupees" value={by} onChange={setBy} options={[{ value: "percent", label: "%" }, { value: "amount", label: "₹" }]} />
      <Field label={by === "percent" ? "Percent off each night" : "Rupees off each night"} error={problem}>
        <TextBox label={by === "percent" ? "Percent off each night" : "Rupees off each night"} value={value} keyboardType="decimal-pad" onChangeText={(x) => setValue(typedFigure(x))} />
      </Field>
      <Why>
        <WhyLine bold="Off each night:" text="on a ₹4,000 night, 25% leaves ₹3,000; ₹500 leaves ₹3,500. GST is worked out on what is left." />
        <WhyLine text="By hand the desk may give up to 10% of a night with a reason. A bigger discount is given only by picking one of these." />
      </Why>
    </Sheet>
  );
}

export type { MoneyList };
