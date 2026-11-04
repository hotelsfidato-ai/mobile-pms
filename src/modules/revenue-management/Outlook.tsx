import { ChevronDown, ChevronRight, Lightbulb, TrendingUp } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DASH } from "../../core/format";
import { c, space, t } from "../../core/theme";
import { Capsule, Head, Screen, useRead } from "../../core/ui";
import { readNearby, readOutlook, readPace, readPickup } from "./data";
import { CardHead, Empty, Failed, Frame, Pill, Refused, Skeleton, Stale, body, small, strong } from "./kit";
import {
  TONE, WORD, aheadBy, dateLines, dayYear, datesWorthALook, nearbyLine, nearbySummary, onTheBooksAWeekAgo, paceTiles,
  pickupNote, rivalPrice, suggestions, temperOf, whyNoPickup, type CheckedNight, type Tile,
} from "./outlook";
import { mayOpen, notYourRole, whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   REVENUE OUTLOOK on a phone — the web's /h/:code/revenue-outlook
   (src/modules/revenue-management/pages/Outlook.tsx; picture
   pms-shots/all/30-rooms-and-rates-revenue-outlook, the GM on 31 Oct).
   Three parts, as the web: this month on the books (pace), what to
   consider (a sentence per night, its reason, the rivals' prices that
   night), and the dates worth a look with their pickup.

   IT SHOWS AND IT SUGGESTS AND IT NEVER CHANGES A PRICE (D18-15): there is
   no control here that writes. Rates is where a price is changed, and the
   web's page names it without a link, so this one does too.

   Every figure is the server's, read through ./data.ts; ./outlook.ts turns
   them into the web's words. Four reads, each its own, so a property whose
   pickup or rivals cannot be read still gets its outlook (the web's).
   ══════════════════════════════════════════════════════════════════ */

const DESCRIPTION = "What the coming ninety nights look like, and what they suggest. Nothing here changes a price - Rates does that.";

export function Outlook({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const closed = mayOpen(role) ? null : notYourRole(role);
  const refused = closed ? null : whyNotRead(role);
  const shut = closed !== null || refused !== null;
  const [pulled, setPulled] = useState(false);

  const outlook = useRead(() => (shut ? Promise.resolve(null) : readOutlook(code)), ["revenue", code, "outlook"]);
  const today = outlook.data?.today ?? "";
  const pace = useRead(() => (today ? readPace(code, today) : Promise.resolve(null)), ["revenue", code, "pace", today]);
  const pickup = useRead(() => (today ? readPickup(code, today) : Promise.resolve(null)), ["revenue", code, "pickup", today]);
  const nearby = useRead(() => (today ? readNearby(code, today) : Promise.resolve(null)), ["revenue", code, "nearby", today]);

  const reload = () => {
    setPulled(true);
    outlook.reload(); pace.reload(); pickup.reload(); nearby.reload();
  };
  const refreshing = pulled && (outlook.loading || pace.loading || pickup.loading || nearby.loading);

  if (shut) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <Head title="Revenue outlook" />
        {/* The web's RequireAccess page; or, should the API ever refuse a role the
            menu lets in (roles.check.ts holds that it does not), its own sentence. */}
        <Refused title={closed ? "This page is not part of your role" : "Could not read the outlook"} sentence={(closed ?? refused)!} />
      </Screen>
    );
  }

  /* Nothing read yet, and the read failed: the page says so (the web's ErrorState). */
  if (outlook.data === undefined && outlook.error) {
    return (
      <Screen refreshing={refreshing} onRefresh={reload}>
        <Head title="Revenue outlook" />
        <Failed error={outlook.error} onRetry={reload} />
      </Screen>
    );
  }

  const reading = outlook.data === undefined;
  const days = outlook.data?.days ?? [];
  const picked = pickup.data ?? null;
  /* The sentence under the table waits for pickup, as the web's (isLoading). */
  const noPickup = !today || (pickup.data === undefined && !pickup.error) ? null : whyNoPickup(picked);
  const nearbyOn = new Map((nearby.data?.nights ?? []).map((n) => [n.date, n]));
  const nearbyRead = nearby.data !== undefined || nearby.error !== undefined;
  const nearbyFailed = nearby.data === undefined && nearby.error !== undefined;
  const stale = [outlook, pace, pickup, nearby].find((r) => r.error && r.data !== undefined)?.error;
  const rows = datesWorthALook(days);

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Head title="Revenue outlook" under={DESCRIPTION} />
      <Stale error={stale} />

      {/* Pace - this month, against the same month last year. */}
      <Card>
        <CardHead Icon={TrendingUp} title="This month, on the books" />
        {reading || (pace.data === undefined && !pace.error) ? (
          <Skeleton height={64} label="Reading this month's figures" />
        ) : pace.data === undefined ? (
          <View style={{ marginTop: 12, gap: 8, alignItems: "flex-start" }} accessibilityRole="alert">
            <Text style={[body, { color: c.red700 }]}>{`Could not read this month's figures: ${pace.error}`}</Text>
            <Capsule label="Try again" onPress={reload} />
          </View>
        ) : pace.data === null ? (
          <Text style={[body, { marginTop: 12 }]}>No figures for this property yet.</Text>
        ) : (
          <Tiles tiles={paceTiles(pace.data.now, aheadBy(pace.data), onTheBooksAWeekAgo(pace.data.now, picked))} />
        )}
      </Card>

      {/* What it would suggest: a sentence, and its reason. */}
      <Card>
        <CardHead Icon={Lightbulb} title="What to consider" />
        {reading ? (
          <Skeleton height={64} label="Reading the coming nights" />
        ) : suggestions(days).length === 0 ? (
          <Text style={[body, { marginTop: 12 }]}>Nothing stands out in the next ninety nights.</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {suggestions(days).map((s, i) => (
              <View key={s.date} style={{ gap: 2, paddingTop: i === 0 ? 0 : 12, paddingBottom: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                <Text style={strong}>{s.text}</Text>
                <Text style={body}>{s.reason}</Text>
                {nearbyRead ? <Nearby night={nearbyOn.get(s.date)} failed={nearbyFailed} /> : null}
              </View>
            ))}
          </View>
        )}
        <Text style={[small, { marginTop: 12 }]}>A suggestion never names a price, and nothing here sets one. Rates is where a rate is changed.</Text>
      </Card>

      {/* Which dates are soft. */}
      <View style={{ gap: 2 }}>
        <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">Dates worth a look</Text>
        <Text style={small}>{pickupNote(today, noPickup)}</Text>
      </View>
      <Frame>
        {reading ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}><Skeleton height={120} label="Reading the coming nights" /></View>
        ) : rows.length === 0 ? (
          <Empty title="No nights ahead yet" description="Once there are bookings on the books for the coming nights, they appear here with how full each one is." />
        ) : (
          rows.map((d, i) => {
            const temper = temperOf(d);
            return (
              <View key={d.date} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                <Text style={strong}>{dayYear(d.date)}</Text>
                <View style={{ marginTop: 6, gap: 4 }}>
                  {dateLines(d, picked).map(([label, value]) => (
                    <Line key={label} label={label}><Text style={[body, t.tab, { color: c.ink900 }]}>{value}</Text></Line>
                  ))}
                  <Line label=""><Pill tone={TONE[temper]}>{WORD[temper]}</Pill></Line>
                </View>
              </View>
            );
          })
        )}
      </Frame>
    </Screen>
  );
}

/** A white card with the web's CardBody padding; 20 below it, as mb-5. */
const Card = ({ children }: { children: ReactNode }) => (
  <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, marginBottom: 8 }}>{children}</View>
);

/** One of DataTable's phone lines: the label in capitals in a 6.5rem column
    (minmax(6.5rem, auto); the picture's values start 104 + 12 px in), its value beside it. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text style={[small, { width: 104, paddingTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }]}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

/** The five figures, two to a row; A week ago across both (max-sm:col-span-2). */
function Tiles({ tiles }: { tiles: Tile[] }) {
  const rows: Tile[][] = [];
  for (const tile of tiles) {
    const last = rows[rows.length - 1];
    if (!tile.wide && last && last.length === 1 && !last[0]!.wide) last.push(tile);
    else rows.push([tile]);
  }
  return (
    <View style={{ marginTop: 12, gap: 16 }}>
      {rows.map((row) => (
        <View key={row[0]!.label} style={{ flexDirection: "row", gap: 16 }}>
          {row.map((tile) => (
            <View key={tile.label} style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[strong, { color: c.grey600 }]} numberOfLines={1}>{tile.label}</Text>
              <Text style={[t.figure, { lineHeight: 28, color: tile.value === DASH ? c.grey500 : c.ink900 }]}>{tile.value}</Text>
              {tile.note ? <Text style={small}>{tile.note}</Text> : null}
            </View>
          ))}
          {row.length === 1 && !row[0]!.wide ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/* The nearby hotels' lowest public prices that night (D27-270): a line,
   opening to the list (the web's <details>). Other hotels' prices on
   Google, never a price this hotel sells at; nothing here sets one. */
function Nearby({ night, failed }: { night: CheckedNight | undefined; failed: boolean }) {
  const [open, setOpen] = useState(false);
  const line = nearbyLine(night, failed);
  if (failed || !night || !nearbySummary(night)) return <Text style={body}>{line}</Text>;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <View>
      <Pressable
        onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={line} accessibilityState={{ expanded: open }}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Chevron size={14} color={c.grey500} />
        <Text style={[body, { flex: 1 }]}>{line}</Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 2, gap: 2 }}>
          {night.hotels.map((h) => (
            <View key={h.name} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 2 }}>
              <Text style={[body, { flexShrink: 1 }]}>{h.name}</Text>
              <Text style={[body, t.tab]}>{rivalPrice(h)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
