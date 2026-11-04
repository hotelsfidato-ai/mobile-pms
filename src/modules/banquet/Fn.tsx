import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Plus, Trash2, TriangleAlert, Users } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { ApiError, HeldError, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { IconBtn, Pill } from "../finance/Kit";
import { Back, Box, Btn, body, Loading, SectionHead, Stale, Toast, message, saidOf, type Said } from "../guest-services/kit";
import { LoadFailed, Note } from "../laundry/kit";
import { BillCard } from "./Bill";
import { CancelDialog, CourseDialog, PriceDialog } from "./Changes";
import { confirmFn, isRefused, readFn, removeCourse } from "./data";
import { Detail, Line, NotAvailable, Panel, Warn } from "./kit";
import { whyNotCancel, whyNotChange, whyNotRead } from "./roles";
import {
  anyOpenOrder, clockOf, mayCancel, mayChangeFood, mayConfirm, moneyLines, orderWords, priceAct, rupees, statusOf, type Course, type Fn,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   ONE FUNCTION on a phone — the web's /h/:code/banquet/:id
   (src/modules/banquet/pages/BanquetEvent.tsx and
   components/FunctionBill.tsx). Not pictured: built from the web's code,
   its cards in its order at phone width (one column): a cancellation, the
   tax warning, what and when, the money, the bill, catering, restaurant
   orders.

   THE MONEY CARD REFUSES A NUMBER IT CANNOT STAND BEHIND: the total is the
   server's, a dash while anything is unpriced, with the server's sentence
   saying what. CONFIRMING TAKES THE HALL: its refusal names the function in
   the way, passed through unchanged; offline it is refused with the web's
   sentence. FOOD IS OPTIONAL: no course is a complete booking.

   A role the API refuses sees each act GREY with the API's sentence
   (roles.ts; AGENTS rule 1), where the web shows it and the server refuses
   (or, for the bill's buttons, leaves them out). A state that rules an act
   out leaves it out, as the web. One tap, one write (MEMORY 8).
   ══════════════════════════════════════════════════════════════════ */

export function FunctionPage({ hotel, role, id, registered, warning, onBack }: {
  hotel: Hotel; role: string | null; id: string; registered?: string; warning?: string; onBack: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotRead(role);
  const [pulled, setPulled] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [addingFood, setAddingFood] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const latch = useRef(false);
  /* The server's own sentence, kept on the screen: a refusal is something somebody acts on. */
  const [refusal, setRefusal] = useState<Said | null>(null);
  const [said, setSaid] = useState<Said | null>(
    registered
      ? warning
        ? { title: "Registered as an enquiry", body: warning, tone: "held" }
        : { title: "Registered", body: `${registered} - an enquiry until it is confirmed.`, tone: "ok" }
      : null,
  );

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readFn(code, id)), ["banquet", code, "fn", id]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const f: Fn | null = q.data && !isRefused(q.data) ? q.data : null;
  const refresh = () => cache.invalidateQueries({ queryKey: ["banquet", code] });
  const done = (s: Said | null) => { setRefusal(null); if (s) setSaid(s); void refresh(); };

  /* A refusal as the web toasts it: its title, the server's sentence; offline, the web's sentence alone. */
  const refused = (title: string, e: unknown): Said =>
    e instanceof HeldError ? saidOf("", e)
      : e instanceof ApiError && e.status === 503 ? { title: message(e), tone: "bad" }
      : { title, body: message(e), tone: "bad" };

  async function confirm() {
    if (latch.current || !f) return;
    latch.current = true;
    setConfirming(true);
    setRefusal(null);
    try {
      await confirmFn(code, f.id);
      await refresh();
      setSaid({ title: "Confirmed", body: "The hall is held, and a bill is open.", tone: "ok" });
    } catch (e) {
      /* The database wrote this sentence and it names the clash: passed through unchanged. */
      setRefusal(refused("The hall is not free", e));
    } finally {
      latch.current = false;
      setConfirming(false);
    }
  }

  async function remove(k: Course) {
    if (latch.current || !f) return;
    latch.current = true;
    setRefusal(null);
    try {
      await removeCourse(code, f.id, k.id);
      await refresh();
    } catch (e) {
      setRefusal(refused("Not removed", e));
    } finally {
      latch.current = false;
    }
  }

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Function" action={<Back onPress={onBack} />} />
        <NotAvailable what="This function" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  const why = { change: whyNotChange(role), cancel: whyNotCancel(role) };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title={f?.title ?? "Function"} {...(f ? { under: `${f.reference} · ${f.venue.name}` } : {})} action={<Back onPress={onBack} />} />

        {f === null ? (
          q.error
            ? (
              <LoadFailed
                title="This function did not load" onRetry={q.reload}
                error={`${q.error} Try again, and tell the manager if it keeps happening.`}
                offline="The server could not be reached, and this device has no saved copy to show. Check the connection, then try again."
              />
            )
            : <Loading words="Reading the function…" />
        ) : (
          <>
            {mayConfirm(f) || mayCancel(f) ? (
              <View style={{ gap: 4, marginTop: -4 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {mayConfirm(f) ? (
                    <Btn
                      label={confirming ? "Confirming…" : "Confirm and hold the hall"} variant="primary" icon={Check}
                      disabled={why.change != null || confirming} onPress={() => void confirm()}
                    />
                  ) : null}
                  {mayCancel(f) ? <Btn label="Cancel" a11y={`Cancel ${f.title}`} disabled={why.cancel != null} onPress={() => setCancelling(true)} /> : null}
                </View>
                {[...new Set([mayConfirm(f) && why.change, mayCancel(f) && why.cancel].filter((x): x is string => Boolean(x)))]
                  .map((r) => <Text key={r} style={[t.caption, { color: c.grey600 }]}>{r}</Text>)}
              </View>
            ) : null}
            <Stale error={q.error} />
            {refusal ? (refusal.body ? <Note title={refusal.title} alert>{refusal.body}</Note> : <Note alert>{refusal.title}</Note>) : null}

            {f.status === "cancelled" && f.cancelReason ? (
              <Warn icon={<TriangleAlert size={16} color={c.red} />}>
                <Text style={face[600]}>Cancelled.</Text> {f.cancelReason}
              </Warn>
            ) : null}
            {/* D27-124: set up while the banquet GST rule is unset; its bill is refused until the GM sets it. */}
            {f.taxWarning && f.status !== "cancelled" ? <Warn icon={<TriangleAlert size={16} color={c.yellow800} />}>{f.taxWarning}</Warn> : null}

            <WhatAndWhen f={f} />

            <Panel>
              <SectionHead title="The money" />
              <View style={{ marginTop: -12 }}>
                {moneyLines(f).map((l) => <Line key={l.label} label={l.label} value={l.value} />)}
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 12 }}>
                {/* NULL when anything is unpriced; the server's sentence says which, so the gap is fixable. */}
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <Text style={[body, { color: c.grey600 }]}>Total</Text>
                  <Text style={[t.figure, { color: f.money.total === null ? c.grey500 : c.ink900 }]}>{rupees(f.money.total)}</Text>
                </View>
                {f.money.unpriced ? <Text style={[body, { marginTop: 6, color: c.yellow800 }]}>{f.money.unpriced}</Text> : null}
              </View>
              {mayChangeFood(f) ? (
                <View style={{ gap: 4 }}>
                  <Btn label={priceAct(f)} disabled={why.change != null} onPress={() => setPricing(true)} />
                  {why.change ? <Text style={[t.caption, { color: c.grey600 }]}>{why.change}</Text> : null}
                </View>
              ) : null}
            </Panel>

            {/* BQ-1: the function's bill - advance, bill, settle, invoice. No folioId (none open, or a role
                without invoice view: the gate blanks it) draws no card, as the web. */}
            {f.folioId ? <BillCard hotel={hotel} f={f} role={role} onDone={done} /> : null}

            <Catering f={f} why={why.change} onAdd={() => setAddingFood(true)} onRemove={(k) => void remove(k)} />
            <Orders f={f} />
          </>
        )}
      </Screen>

      {pricing && f ? (
        <PriceDialog
          code={code} f={f} onClose={() => setPricing(false)}
          onDone={() => { setPricing(false); done({ title: "Saved", tone: "ok" }); }}
        />
      ) : null}
      {addingFood && f ? (
        <CourseDialog
          code={code} f={f} onClose={() => setAddingFood(false)}
          onDone={() => { setAddingFood(false); done(null); }}
        />
      ) : null}
      {cancelling && f ? (
        <CancelDialog
          code={code} f={f} onClose={() => setCancelling(false)}
          onDone={() => { setCancelling(false); done({ title: "Cancelled", body: "The hall is free again.", tone: "ok" }); }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── What and when: the state, then its facts, one column at phone width ── */
function WhatAndWhen({ f }: { f: Fn }) {
  const s = statusOf(f.status);
  return (
    <Panel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Pill tone={s.tone} label={s.label} />
        {f.status === "enquiry" ? <Text style={[body, { color: c.grey600 }]}>This holds nothing. Confirming takes the hall.</Text> : null}
      </View>
      <Detail label="From">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Clock size={14} color={c.grey400} />
          <Text style={[body, t.tab, { color: c.ink900 }]}>{clockOf(f.startsAt)}</Text>
        </View>
      </Detail>
      <Detail label="Until">{clockOf(f.endsAt)}</Detail>
      <Detail label="Host">{f.hostName}</Detail>
      <Detail label="Telephone">{f.hostPhone ?? "-"}</Detail>
      <Detail label="Expected guests">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Users size={14} color={c.grey400} />
          <Text style={[body, t.tab, { color: f.pax === null ? c.grey500 : c.ink900 }]}>{f.pax ?? "-"}</Text>
        </View>
      </Detail>
      <Detail label="Guaranteed">{f.paxGuaranteed === null ? "-" : String(f.paxGuaranteed)}</Detail>
      <Detail label="Hall">
        <Text style={[body, { color: c.ink900 }]}>
          {f.venue.name}
          {f.venue.seated !== null ? <Text style={{ color: c.grey500 }}> · seats {f.venue.seated}</Text> : null}
        </Text>
      </Detail>
      <Detail label="Registered by">
        <View>
          <Text style={[body, { color: f.registeredBy ? c.ink900 : c.grey500 }]}>{f.registeredBy ?? "-"}</Text>
          <Text style={[t.caption, t.tab, { marginTop: 2 }]}>{clockOf(f.registeredAt)}</Text>
        </View>
      </Detail>
      {f.notes ? (
        <View style={{ borderRadius: 8, backgroundColor: c.grey50, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={[body, { color: c.ink900 }]}>{f.notes}</Text>
        </View>
      ) : null}
    </Panel>
  );
}

/* ── Catering: a course a row, a hairline between; its parts, not a product the phone made ── */
function Catering({ f, why, onAdd, onRemove }: { f: Fn; why: string | null; onAdd: () => void; onRemove: (k: Course) => void }) {
  const open = mayChangeFood(f);
  return (
    <Box>
      <View style={{ paddingHorizontal: space.cardX, paddingTop: space.cardY }}>
        <SectionHead title="Catering" {...(open ? { action: <Btn label="Add a course" icon={Plus} disabled={why != null} onPress={onAdd} /> } : {})} />
        {open && why ? <Text style={[t.caption, { color: c.grey600, marginTop: -8, marginBottom: 8 }]}>{why}</Text> : null}
      </View>
      {f.catering.length === 0 ? (
        /* Not a nag: a hall let for a meeting feeds nobody, and that is a complete booking. */
        <Text style={[body, { color: c.grey500, textAlign: "center", paddingHorizontal: space.cardX, paddingTop: 8, paddingBottom: 24 }]}>
          Nothing is being served. That is a complete booking - add a course only if food is part of it.
        </Text>
      ) : (
        f.catering.map((k) => (
          <View key={k.id} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[body, { color: c.ink900 }]}>{k.name}</Text>
              <Text style={[body, t.tab, { color: c.grey500 }]}>
                {k.pax} {k.pax === 1 ? "plate" : "plates"}{" · "}
                {k.ratePerHead === null ? <Text style={{ color: c.yellow800 }}>no rate agreed</Text> : `${rupees(k.ratePerHead)} each`}
                {k.notes ? ` · ${k.notes}` : ""}
              </Text>
            </View>
            {open ? <IconBtn Icon={Trash2} label={`Remove ${k.name}`} why={why} onPress={() => onRemove(k)} /> : null}
          </View>
        ))
      )}
    </Box>
  );
}

/* ── Restaurant orders charged to this function (D17-21): an open one is listed, and outside the total ── */
function Orders({ f }: { f: Fn }) {
  return (
    <Box>
      <View style={{ paddingHorizontal: space.cardX, paddingTop: space.cardY }}><SectionHead title="Restaurant orders" /></View>
      {f.restaurantOrders.length === 0 ? (
        <Text style={[body, { color: c.grey500, textAlign: "center", paddingHorizontal: space.cardX, paddingTop: 8, paddingBottom: 24 }]}>
          No restaurant orders are charged to this function.
        </Text>
      ) : (
        <>
          {f.restaurantOrders.map((o) => (
            <View key={o.id} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <Text style={[body, t.tab, { color: c.ink900 }]}>{o.orderNo}</Text>
                  <Pill tone={o.status === "settled" ? "success" : "neutral"} label={o.status === "settled" ? "Settled" : "Open"} />
                </View>
                <Text style={[body, t.tab, { marginTop: 2, color: c.grey500 }]}>{orderWords(o)}</Text>
              </View>
              <Text style={[body, t.tab, { color: o.amount === null ? c.grey500 : c.ink900 }]}>{rupees(o.amount)}</Text>
            </View>
          ))}
          {anyOpenOrder(f.restaurantOrders) ? (
            <Text style={[body, { color: c.grey600, paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }]}>
              An open order is not in the total until it is settled.
            </Text>
          ) : null}
        </>
      )}
    </Box>
  );
}
