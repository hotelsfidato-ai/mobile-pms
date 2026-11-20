import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { askFirst, Btn, ListRow, useRowWrite } from "../banquet/setupKit";
import { Box, body, Loading, NotYours, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed, Note } from "../laundry/kit";
import { isRefused } from "./data";
import { labelOf, NOT_YOURS, sortedRoles, standing, switchAct, switchedWords, switchOffAsk, yesOrDash } from "./requesters";
import { readRequesters, setRequester } from "./requestersData";
import { whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   WHO MAY ASK TO BUY on a phone (lane U, 19 Nov) — the web's
   /h/:code/purchasing/who-may-ask (src/modules/purchasing/pages/
   WhoMayAsk.tsx; picture pms-shots/all/35-store-and-equipment-who-may-ask-
   to-buy, as dev-gm). The owner's D18-2: a SETTING per property, a ROLE
   and not a person, switched off and never deleted, taking effect at once.

   Every switch is shown to anybody who may see purchasing (a person refused
   needs to know whom to ask); only the owner and an administrator move one
   - the server says which (`mayChange`). The rest see "Yes" or a dash and
   the web's card saying who may, as the web. Switching off asks first.
   ══════════════════════════════════════════════════════════════════ */

export function WhoMayAsk({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotRead(role);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readRequesters(code)), ["purchasing", code, "requesters"]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const d = q.data && !isRefused(q.data) ? q.data : null;
  /* The Purchasing screen asks the same question of itself: both are read again. */
  const reread = () => void cache.invalidateQueries({ queryKey: ["purchasing", code] });
  const row = useRowWrite(setSaid, reread);

  const flip = (r: string, next: boolean) => {
    const go = () => void row.run(r, () => setRequester(code, r, next), {
      ok: switchedWords(r, next), refused: "Not changed", done: "changed", where: "the list",
    });
    if (next) go(); else { const a = switchOffAsk(r); askFirst(a.title, a.body, "Switch off", go); }
  };

  const head = (
    <Head
      title="Who may ask to buy" action={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ShieldCheck size={20} color={c.grey500} /></View>}
      under="The roles at this property that may raise a purchase request. It takes effect at once - nothing has to be released for it. The general manager still approves every purchase, whoever asked."
    />
  );

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        {head}
        <NotYours title="Purchasing" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        {head}
        <View style={{ marginTop: -4, alignItems: "flex-start" }}>
          <Btn label="Back to purchasing" onPress={onBack} />
        </View>

        {d === null ? (
          q.error ? (
            <LoadFailed
              title="The setting did not load" error={q.error} onRetry={q.reload}
              offline="This device is offline, so the setting cannot load. It loads by itself as soon as the connection is back."
            />
          ) : <Loading words="Reading who may ask…" />
        ) : (
          <>
            <Stale error={q.error} />
            {!d.mayChange ? <Note>{NOT_YOURS}</Note> : null}
            <Box style={{ overflow: "hidden" }}>
              {sortedRoles(d.roles).map((r, i) => (
                <ListRow key={r.role} first={i === 0}>
                  <View style={{ flex: 1, minWidth: 140, gap: 2 }}>
                    <Text style={[body, { color: c.ink900, ...face[500] }]}>{labelOf(r.role)}</Text>
                    <Text style={t.caption}>{standing(r.mayRaise)}</Text>
                  </View>
                  {d.mayChange ? (
                    <Btn
                      label={row.busy(r.role) ? "Saving…" : switchAct(r.mayRaise)} a11y={`${switchAct(r.mayRaise)}: ${labelOf(r.role)}`}
                      disabled={row.busy(r.role)} onPress={() => flip(r.role, !r.mayRaise)}
                    />
                  ) : (
                    <Text style={[body, { color: r.mayRaise ? c.ink900 : c.grey500 }]}>{yesOrDash(r.mayRaise)}</Text>
                  )}
                </ListRow>
              ))}
            </Box>
          </>
        )}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}
