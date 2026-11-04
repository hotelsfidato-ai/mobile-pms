import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ban, FileDown, IndianRupee, Send, Truck } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DASH } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Back, Btn, body, Loading, NotYours, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed, Note } from "../laundry/kit";
import { CancelDialog, PriceDialog, SendDialog } from "./Acts";
import { Delivery } from "./Delivery";
import { isRefused, readApproval, readPurchasing, readRequest } from "./data";
import { Fact, StatePill, useBackInView, YellowChip } from "./kit";
import {
  creditLine, decidedCard, deliveredTitle, factsOf, figure, lineParts, mayCancel, mayDeliver, mayDownload, mayPrice, maySend,
  rupees, STATE_TONE, STATE_WORDS, unpricedTile, type PurchaseLine, type RequestDetail,
} from "./purchase";
import { ON_THE_WEBSITE, whyNotAct, whyNotRead, whyNotReceive } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   ONE PURCHASE on a phone — the web's /h/:code/purchasing/:id
   (src/modules/purchasing/pages/PurchaseRequest.tsx). Not pictured: built
   from the web's code. What was asked for, what it costs, and what came.

   Four acts here, each with one condition (purchase.ts), the web's:
     price a line          until the order has gone out
     send the order        approved AND every line priced
     record the delivery   once the order has been sent
     cancel                any time before it was delivered, with a reason
   A state that rules an act out leaves it out, and the web's card says why
   (the unpriced tile, the decided card). A person the API refuses sees it
   GREY with the API's sentence (roles.ts; AGENTS rule 1): price, send and
   cancel are the property's setting (`me.mayRaise`), the delivery is the
   Store's rule (stock create), which the route asks and the setting does not.

   THE APPROVAL IS NOT DECIDED HERE. It is one row of the one approvals
   engine, and the phone decides it in Approvals (/approvals/:code), where
   it is a "Purchase request" with this request's reason and amount. This
   screen reads that row (the server's mayDecide / blockedBecause) and links
   to it; coming back, the order reads again. The web's order page keeps its
   own Approve / Refuse / Send back (D18-19); the phone has one place.

   Every write is refused offline with the web's sentence; one tap is one
   write (latched); a keeper per request (data.ts).
   ══════════════════════════════════════════════════════════════════ */

export function Request({ hotel, role, id, onBack }: { hotel: Hotel; role: string | null; id: string; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotRead(role);
  const [pulled, setPulled] = useState(false);
  const [act, setAct] = useState<null | "send" | "deliver" | "cancel">(null);
  const [pricing, setPricing] = useState<PurchaseLine | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const unsay = useCallback(() => setSaid(null), []);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readRequest(code, id)), ["purchasing", code, "request", id]);
  /* The same read the list makes: the suppliers, and whether this person may act (the setting). */
  const list = useRead(() => (refusedRead ? Promise.resolve(null) : readPurchasing(code)), ["purchasing", code, "list"]);
  useBackInView(["purchasing", code]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const d: RequestDetail | null = q.data && !isRefused(q.data) ? q.data : null;
  const r = d?.request ?? null;
  const listed = list.data && !isRefused(list.data) ? list.data : null;
  const waiting = r?.state === "waiting";
  const approval = useRead(() => (waiting ? readApproval(code, id) : Promise.resolve(null)), ["purchasing", code, "approval", id, waiting]);

  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["purchasing", code] });
    void cache.invalidateQueries({ queryKey: ["approvals", code] });
  };
  const done = (title: string) => { setAct(null); setPricing(null); refresh(); setSaid({ title, tone: "ok" }); };

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Purchase order" action={<Back onPress={onBack} />} />
        <NotYours title="Purchasing" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  /* Who: the setting as the server answered it (not known until the list is read: not offered), and the Store's rule. */
  const why = { act: listed ? whyNotAct(listed.me.mayRaise) : null, receive: whyNotReceive(role) };
  /* Until the list is read the setting is unknown: grey, with no sentence that may be wrong. */
  const noAct = !listed || why.act != null;
  const shown = r ? { download: mayDownload(r.state), send: maySend(r), deliver: mayDeliver(r.state), cancel: mayCancel(r.state) } : null;
  const reasons = shown
    ? [...new Set([(shown.send || shown.cancel || (r && mayPrice(r.state))) && why.act, shown.deliver && why.receive].filter((x): x is string => Boolean(x)))]
    : [];
  const tile = r ? unpricedTile(r) : null;
  const decided = r ? decidedCard(r) : null;
  const priceable = r !== null && mayPrice(r.state);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); list.reload(); approval.reload(); }}>
        <Head title={r?.reference ?? "Purchase order"} {...(r ? { under: r.reason } : {})} action={<Back onPress={onBack} />} />

        {d === null || r === null ? (
          q.error
            ? (
              <LoadFailed
                title="This order did not load" error={q.error} onRetry={q.reload}
                offline="This device is offline, so this order cannot load. It loads by itself as soon as the connection is back."
              />
            )
            : <Loading words="Reading the order…" />
        ) : (
          <>
            <Stale error={q.error} />
            <View style={{ marginTop: -8 }}><StatePill tone={STATE_TONE[r.state]}>{STATE_WORDS[r.state]}</StatePill></View>

            {/* The web's header actions, in its order. */}
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {shown!.download ? <Btn label="Download the order" icon={FileDown} disabled onPress={() => undefined} /> : null}
                {shown!.send ? <Btn label="Send the order" variant="primary" icon={Send} disabled={noAct} onPress={() => setAct("send")} /> : null}
                {shown!.deliver ? <Btn label="Record the delivery" variant="primary" icon={Truck} disabled={why.receive != null} onPress={() => setAct("deliver")} /> : null}
                {shown!.cancel ? <Btn label="Cancel" a11y={`Cancel ${r.reference}`} variant="danger" icon={Ban} disabled={noAct} onPress={() => setAct("cancel")} /> : null}
              </View>
              {shown!.download ? <Text style={[t.caption, { color: c.grey600 }]}>Download the order: {ON_THE_WEBSITE}</Text> : null}
              {reasons.map((x) => <Text key={x} style={[t.caption, { color: c.grey600 }]}>{x}</Text>)}
              {!listed && list.error ? (
                <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">Could not read who may act on this order: {list.error}</Text>
              ) : null}
            </View>

            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
              {factsOf(r).map((f) => <Fact key={f.label} label={f.label} value={f.value} half />)}
            </View>

            {/* WHERE THE APPROVAL IS, in words, with the way to it: one inbox, one engine. */}
            {waiting ? (
              <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 4 }}>
                <Text style={t.heading}>Waiting for the general manager</Text>
                <Text style={[body, { color: c.grey600 }]}>
                  It is decided through the one approvals engine every approval in this system goes through. Nobody approves a purchase they asked for themselves.
                </Text>
                {approval.data && approval.data.status === "pending" && !approval.data.mayDecide && approval.data.blockedBecause ? (
                  <Text style={[body, { color: c.grey600, marginTop: 2 }]}>{approval.data.blockedBecause}</Text>
                ) : null}
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <Btn
                    label="Open Approvals" a11y="Open Approvals, where this purchase request is decided"
                    variant={approval.data?.mayDecide ? "primary" : "secondary"} onPress={() => router.push(`/approvals/${code}`)}
                  />
                </View>
                {approval.data?.mayDecide ? (
                  <Text style={[t.caption, { color: c.grey600 }]}>It is yours to decide: it is there as a Purchase request. This order reads again when you come back.</Text>
                ) : null}
              </View>
            ) : null}
            {decided ? (
              <Note title={decided.title}>{`${decided.note}\nA decision stays on the record. To go ahead after this, raise a new request.`}</Note>
            ) : null}
            {r.state === "cancelled" ? <Note title="Cancelled">{r.cancelledReason ?? DASH}</Note> : null}
            {r.state === "received" ? (
              <Note title={deliveredTitle(r)}>
                {`${r.deliveryNote ?? "Nothing was noted about the delivery."}${d.credit ? `\n${creditLine(d.credit)}` : ""}`}
              </Note>
            ) : null}

            {/* The lines: one block each (the web's six columns scroll sideways inside their card at 390 px). */}
            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
              {d.lines.map((l, i) => (
                <View key={l.id} style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                  <View>
                    <Text style={[body, { color: c.ink900 }]}>
                      <Text style={face[600]}>{l.item}</Text>
                      <Text style={{ color: c.grey500 }}> · {l.unit}</Text>
                    </Text>
                    {l.note ? <Text style={[body, { color: c.grey600 }]}>{l.note}</Text> : null}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                    <Fact half label="Ordered" value={figure(l.quantity)} />
                    <Fact half label="Agreed price" value={rupees(l.unitPrice)} />
                    {/* The web multiplies this on the device; the phone shows its parts. */}
                    <Fact half label="Amount" value={lineParts(l)} />
                    <Fact half label="Came" value={figure(l.receivedQuantity)} />
                    <Fact half label="Cost" value={rupees(l.receivedUnitCost)} />
                  </View>
                  {priceable ? (
                    <View style={{ flexDirection: "row" }}>
                      <Btn
                        label={l.unitPrice === null ? "Agree a price" : "Change the price"} a11y={`Agreed price for ${l.item}`}
                        icon={IndianRupee} disabled={noAct} onPress={() => setPricing(l)}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            {tile ? (
              <View style={{
                flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1,
                backgroundColor: tile.warm ? c.yellow50 : c.white, borderColor: tile.warm ? c.yellow100 : c.grey200,
              }}>
                {tile.warm ? <YellowChip Icon={IndianRupee} /> : null}
                <Text style={[body, { flex: 1, color: tile.warm ? c.ink900 : c.grey600 }]}>{tile.text}</Text>
              </View>
            ) : null}
          </>
        )}
      </Screen>

      {r && d && act === "send" ? (
        <SendDialog code={code} id={id} suppliers={listed?.suppliers ?? []} onClose={() => setAct(null)} onDone={done} />
      ) : null}
      {r && d && act === "deliver" ? (
        <Delivery code={code} id={id} store={r.store.name} lines={d.lines} hotel={hotel} onClose={() => setAct(null)} onDone={done} />
      ) : null}
      {r && act === "cancel" ? (
        <CancelDialog code={code} id={id} reference={r.reference} onClose={() => setAct(null)} onDone={done} />
      ) : null}
      {pricing ? <PriceDialog code={code} id={id} line={pricing} onClose={() => setPricing(null)} onDone={() => { setPricing(null); refresh(); }} /> : null}
      <Toast said={said} onClose={unsay} />
    </View>
  );
}
