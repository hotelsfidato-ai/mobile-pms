import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { getConnectionsHealth } from "./data";
import { Failed, Loading, Pill, Refused, Sheet, Stale, body, small } from "./kit";
import { whyNotHealth } from "./roles";
import { HEALTH_UNDER, alertsLine, lastLine, pillOf, type Connection } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   CONNECTION HEALTH on a phone — the web's Settings → Modules and
   connections → Connection health (/settings/connections/connection-health;
   src/modules/connections-health/pages/ConnectionHealth.tsx, D27-276).
   Every outside connection - emails and WhatsApp through n8n, the CRS,
   Firebase sign-in, the backups, the server's disk, rivals' prices -
   green, amber, red or grey, with its last success and its last error,
   JUDGED ON THE SERVER (api/src/modules/connections-health/health.ts) for
   this property. Read only: nothing here changes a connection.
   No picture: pms-shots has none of this page (all/68 is the admin
   Integrations page, refused to the GM); built from the web's code.
   ══════════════════════════════════════════════════════════════════ */

const OFFLINE = {
  title: "No connection",
  description: "This phone is offline, so the connections' health cannot load. Pull down to read it again once the connection is back.",
};

export function ConnectionHealth({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refused = whyNotHealth(role);
  const [pulled, setPulled] = useState(false);
  const q = useRead(() => (refused ? Promise.resolve(null) : getConnectionsHealth(code)), ["guest-messaging", code, "health"]);
  const data = q.data;

  return (
    <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
      <Head title="Connection health" under={HEALTH_UNDER} />
      {refused ? <Refused title="The connections' health is not available" reason={refused} />
        : data === undefined
          ? (q.error
            ? <Failed title="The connections' health did not load" error={q.error} offline={OFFLINE} onRetry={q.reload} />
            : <Loading what="Reading the connections' health…" />)
          : data === null ? null
          : (
            <>
              <Stale error={q.error} />
              <Sheet>
                {data.connections.map((x, i) => <Item key={x.key} x={x} last={i === data.connections.length - 1} />)}
              </Sheet>
              <Text style={[body, { color: c.grey600 }]}>{alertsLine(data.alertsTo)}</Text>
            </>
          )}
    </Screen>
  );
}

function Item({ x, last }: { x: Connection; last: boolean }) {
  const pill = pillOf(x.status);
  return (
    <View
      accessible accessibilityLabel={`${x.label}: ${pill.words}. ${x.summary} ${lastLine(x)}`}
      style={{ paddingHorizontal: space.cardX, paddingVertical: 14, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.grey100 }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[body, { color: c.ink900, ...face[600] }]}>{x.label}</Text>
        <Text style={[body, { color: c.grey600, marginTop: 2 }]}>{x.summary}</Text>
        <Text style={[small, { color: c.grey500, marginTop: 4 }]}>{lastLine(x)}</Text>
      </View>
      <Pill tone={pill.tone}>{pill.words}</Pill>
    </View>
  );
}
