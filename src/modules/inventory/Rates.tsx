import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, s, useRead } from "../../core/ui";
import { readInventory, readPricing, readRateDays } from "./data";
import { BaseDialog, RestrictionDialog, type DayTarget, type PriceTarget } from "./Dialogs";
import { BaseGrid, RoomsGrid, RoomsLegend, type Nav } from "./Grid";
import { Btn, Empty, Failed, Refused, Segmented, Stale, Toast, body, type Said } from "./kit";
import {
  DAYS, addDays, dateShort, differenceOf, figure, offered, rupees, windowOf,
  type Addons, type DayRules, type Pricing,
} from "./rates";
import { ON_THE_WEBSITE, PRICE, PRICES, RESTRICTION, refusalFor, whyNot } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   RATES on a phone — the web's /h/:code/rates (src/modules/inventory/
   pages/Rates.tsx; pictures pms-shots/all/27-rooms-and-rates-pricing and
   28-rooms-and-rates-rate-calendar, one page: /pricing and /grids open it).

   THE QUICK CHANGE is here: a room type's base for a day or through a
   later day (tap a price, or Set prices), and closing or opening a day -
   stop sell, closed to arrival or departure, the nights a stay keeps (the
   Rooms left view, tap a day). The calendar, its break-up and how each day
   sold are read as the web reads them.

   ON THE WEBSITE (heavy set-up, drawn as the picture with its control
   disabled): How rates are built's Edit (the base room type, each type's
   difference, the add-ons) and Prices set before's Remove; and the four
   report links, whose screens the phone does not have.
   ══════════════════════════════════════════════════════════════════ */

type View_ = "prices" | "rooms";

/** The setup's add-ons, in the web's order and words (Rates.tsx ADDONS). */
const ADDONS: { key: keyof Addons; label: string }[] = [
  { key: "CP", label: "Breakfast (CP), per guest" },
  { key: "MAP", label: "MAP, per guest" },
  { key: "AP", label: "AP, per guest" },
  { key: "AI", label: "All inclusive (AI), per guest" },
  { key: "double", label: "Double occupancy (the second guest)" },
  { key: "extraAdult", label: "Extra adult (from the third guest)" },
  { key: "extraChild", label: "Extra child (from the third guest)" },
];

export function Rates({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const cannotRead = whyNot(PRICES, role);
  const mayEdit = whyNot(PRICE, role) === null;
  /* The window the SERVER chose first (the business date) is the one the
     arrows move and Today returns to (Rates.tsx 112-115). */
  const [from, setFrom] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [view, setView] = useState<View_>("prices");
  const [price, setPrice] = useState<PriceTarget | null>(null);
  const [setting, setSetting] = useState(false);
  const [day, setDay] = useState<DayTarget | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);

  const none = () => Promise.resolve(null);
  const inventory = useRead(
    () => (cannotRead ? none() : readInventory(code, from ?? undefined, from ? addDays(from, DAYS - 1) : undefined)),
    ["inventory", code, "rooms", from],
  );
  const pricing = useRead(() => (cannotRead || !from ? none() : readPricing(code, from, DAYS)), ["inventory", code, "pricing", from]);
  const days = useRead(() => (cannotRead || !from ? none() : readRateDays(code, from, DAYS)), ["inventory", code, "days", from]);

  useEffect(() => {
    if (!from && inventory.data) { setFrom(inventory.data.from); setToday(inventory.data.from); }
  }, [from, inventory.data]);

  const refresh = () => void cache.invalidateQueries({ queryKey: ["inventory", code] });
  const done = (s_: Said) => { setSaid(s_); refresh(); };
  const nav: Nav | null = from ? { from, today: today ?? from, onMove: setFrom, rules: (hotel as Hotel & { deskRules?: DayRules }).deskRules } : null;
  const dates = from ? windowOf(from) : [];
  const types = pricing.data ? offered(pricing.data) : [];

  let main;
  if (cannotRead) main = <Empty title="Rates" description={cannotRead} />;
  else if (inventory.data === undefined || (inventory.data && !from)) {
    main = inventory.error
      ? <Failed title="The rates did not load" error={inventory.error} onRetry={inventory.reload} />
      : <Text style={t.label} accessibilityLiveRegion="polite">Reading the rates…</Text>;
  } else if (inventory.data === null) {
    main = <Empty title="No room types" description="Add room types to this property and the calendar fills in." />;
  } else if (view === "rooms") {
    main = inventory.data.cells.length === 0
      ? <Empty title="No room types" description="Add room types to this property and both grids fill in." />
      : (
        <>
          {mayEdit ? null : <Text style={[t.caption, { color: c.grey600 }]}>{refusalFor(RESTRICTION)}</Text>}
          <RoomsGrid nav={nav!} dates={dates} cells={inventory.data.cells} restrictions={inventory.data.restrictions} mayEdit={mayEdit} onTap={setDay} />
          <RoomsLegend />
        </>
      );
  } else if (pricing.data === undefined) {
    main = pricing.error
      ? <Failed title="The prices did not load" error={pricing.error} onRetry={pricing.reload} />
      : <Text style={t.label} accessibilityLiveRegion="polite">Reading the prices…</Text>;
  } else if (pricing.data === null || pricing.data.roomTypes.length === 0) {
    main = <Empty title="No room types" description="Add room types and the calendar fills in." />;
  } else {
    main = (
      <>
        <Stale error={pricing.error} />
        <BaseGrid code={code} nav={nav!} dates={dates} pricing={pricing.data} left={inventory.data.cells} days={days.data ?? undefined} mayEdit={mayEdit} onTap={setPrice} />
        {days.error ? <Stale error={days.error} /> : null}
        <PriceLegend mayEdit={mayEdit} />
        <SetupCard pricing={pricing.data} mayEdit={mayEdit} />
        <OlderPrices pricing={pricing.data} mayEdit={mayEdit} />
        <ReportLinks />
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && inventory.loading} onRefresh={() => { setPulled(true); refresh(); }}>
        <Head title="Rates" under="Each day's price, and how the day sold. The add-ons follow the base." />
        {cannotRead ? null : (
          <View style={{ gap: 12, marginTop: -4 }}>
            <Segmented<View_> label="Prices or rooms left" value={view} onChange={setView}
              options={[{ value: "prices", label: "Prices" }, { value: "rooms", label: "Rooms left" }]} />
            {view === "prices" && pricing.data && types.length > 0 ? (
              mayEdit
                ? <View style={{ flexDirection: "row" }}><Btn label="Set prices" variant="primary" onPress={() => setSetting(true)} /></View>
                : <Refused label="Set prices" variant="primary" reason={refusalFor(PRICE)} />
            ) : null}
          </View>
        )}
        {inventory.data && from ? <Stale error={inventory.error} /> : null}
        {main}
      </Screen>
      {price ? <BaseDialog code={code} target={price} onClose={() => setPrice(null)} onDone={done} /> : null}
      {setting && from && types[0] ? (
        <BaseDialog code={code} types={types} target={{ roomTypeId: types[0].id, roomType: types[0].name, date: from, price: null }}
          onClose={() => setSetting(false)} onDone={done} />
      ) : null}
      {day && inventory.data ? (
        <RestrictionDialog code={code} target={day}
          existing={inventory.data.restrictions.find((r) => r.roomTypeId === day.roomTypeId && r.date === day.date)}
          onClose={() => setDay(null)} onDone={done} />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── Under the calendar (Rates.tsx 765-780) ──────────────────────── */

function PriceLegend({ mayEdit }: { mayEdit: boolean }) {
  const small = { fontSize: 12, lineHeight: 18, ...face[500] };
  return (
    <View style={{ gap: 10 }}>
      {mayEdit ? <Text style={[body, { color: c.grey600 }]}>Tap any price to change it, for that day or through a later day.</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 8 }}>
        <Text style={[small, { color: c.grey600 }]}><Text style={[face[700], { color: c.ink900 }]}>4,000</Text> a base</Text>
        <Text style={[small, { color: c.grey600 }]}>4,000 from the base room type</Text>
        <Text style={[small, { color: c.grey500, fontStyle: "italic" }]}>4,000 a price set before (covers 2)</Text>
        <Text style={[small, { color: c.grey500 }]}>- not priced</Text>
        <Text style={[small, { color: c.grey500 }]}>3 left: rooms of the type still to sell that day</Text>
        <Text style={[small, { color: c.grey500 }]}>
          Paying rooms sold, ADR and revenue leave complimentary rooms and day use out; occupancy counts complimentary rooms, as the reports do.
        </Text>
      </View>
    </View>
  );
}

/** A card with the web's CardHeader: title, description, an action at its right. */
function HeadCard({ title, description, action, why, children }: { title: string; description: string; action?: ReactNode; why?: string; children: ReactNode }) {
  return (
    <View style={[s.card, { paddingHorizontal: 0, paddingVertical: 0 }]}>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: space.cardX, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={t.heading} accessibilityRole="header">{title}</Text>
          <Text style={[body, { color: c.grey500 }]}>{description}</Text>
          {why ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
        </View>
        {action}
      </View>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: 14 }}>{children}</View>
    </View>
  );
}

/** Set-up, left on the website: the button drawn, disabled; the card says
    why - on the website for now, or the API's sentence for one who may not. */
const Off = ({ label }: { label: string }) => <Btn label={label} disabled onPress={() => undefined} />;
const whyOff = (mayEdit: boolean) => (mayEdit ? ON_THE_WEBSITE : refusalFor(PRICE));

/* ── How rates are built (SetupCard, read only here) ─────────────── */

function SetupCard({ pricing, mayEdit }: { pricing: Pricing; mayEdit: boolean }) {
  const { basis } = pricing;
  const derived = pricing.roomTypes.filter((x) => basis && x.id !== basis.roomTypeId);
  const line = (key: string, label: string, value: string, muted: boolean) => (
    <View key={key} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 3 }}>
      <Text style={[body, { color: c.grey600, flexShrink: 1 }]}>{label}</Text>
      <Text style={[body, t.tab, { color: muted ? c.grey500 : c.ink900 }]}>{value}</Text>
    </View>
  );
  return (
    <HeadCard
      title="How rates are built"
      description={basis
        ? `Every room type is derived from ${basis.roomType}. The add-ons ride on every base.`
        : "Each room type has its own base. The add-ons ride on every base."}
      action={<Off label="Edit" />} why={whyOff(mayEdit)}
    >
      {derived.map((x) => line(x.id, x.name, differenceOf(x.difference), x.difference === null))}
      {ADDONS.map((a) => line(a.key, a.label, figure(pricing.addons[a.key]), pricing.addons[a.key] === null))}
      <Text style={[t.caption, { marginTop: 10, lineHeight: 17 }]}>A base covers one guest, room only. A dash is not set: nothing that needs it is sold.</Text>
    </HeadCard>
  );
}

/* ── Prices set before (OlderPrices, read only here) ─────────────── */

function OlderPrices({ pricing, mayEdit }: { pricing: Pricing; mayEdit: boolean }) {
  const name = (id: string) => pricing.roomTypes.find((x) => x.id === id)?.name ?? "";
  const racks = pricing.roomTypes.filter((x) => x.rack !== null);
  if (pricing.older.length === 0 && racks.length === 0) return null;
  const items = [
    ...pricing.older.map((o) => ({
      key: o.id,
      what: `${name(o.roomTypeId)} · ${o.mealPlan} · ${rupees(o.price)}, covers ${o.covers}`,
      when: `${dateShort(o.from)}${o.to ? ` to ${dateShort(addDays(o.to, -1))}` : " onwards"}${o.label ? ` · ${o.label}` : ""}`,
    })),
    ...racks.map((x) => ({ key: x.id, what: `${x.name} · old rack rate ${rupees(x.rack)}, covers ${x.baseOccupancy}`, when: "Used only on dates no base covers." })),
  ];
  return (
    <HeadCard title="Prices set before" description="Kept exactly as they were: each covers the guests it always did, and wins over the base on its dates." why={whyOff(mayEdit)}>
      {items.map((it, i) => (
        <View key={it.key} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
          <View style={{ flex: 1 }}>
            <Text style={[body, { color: c.ink900 }]}>{it.what}</Text>
            <Text style={[body, { color: c.grey500 }]}>{it.when}</Text>
          </View>
          <Off label="Remove" />
        </View>
      ))}
    </HeadCard>
  );
}

/* ── The reports, one tap away on the web (ReportLinks) ──────────── */

function ReportLinks() {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 8 }}>
        {["Manager report", "Monthly occupancy", "Monthly statistics", "Revenue outlook"].map((l) => (
          <Text key={l} style={[body, { color: c.grey500 }]} accessibilityState={{ disabled: true }}>{l}</Text>
        ))}
      </View>
      <Text style={t.caption}>{ON_THE_WEBSITE}</Text>
    </View>
  );
}
