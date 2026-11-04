import { unknownSaid } from "./kit";
import { outcomeUnknown } from "../../core/api";
import { useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { LoadFailed } from "../laundry/kit";
import { Back, Box, Btn, body, Dialog, Empty, Foot, InDialog, Loading, NotYours, Pill, Stale, Toast, saidOf, type Said } from "../guest-services/kit";
import { isRefused, readHistory, readStore, undoMovement } from "./data";
import { UNDO_NOT_YOURS, whyNotCorrect, whyNotSee } from "./roles";
import {
  nounOf, rowCameIn, rowFacts, rowLine, rowQuantity, rowTitle, rupees, undoable, undoQuestion, type StockMovement,
} from "./shelf";

/* ══════════════════════════════════════════════════════════════════
   ONE ITEM'S HISTORY — the web's HistoryDialog (pages/Stores.tsx
   1298-1470), a screen of its own on the phone: why the count is what it
   is. Every movement, the undone ones grey, an undo dashed; Undo ASKS
   FIRST (STO-6) and is for the people who correct counts. Not pictured:
   built from the code. A look-only person reads it, with the web's
   sentence saying who may undo.
   ══════════════════════════════════════════════════════════════════ */

export function ItemHistory({ hotel, role, id, onBack }: { hotel: Hotel; role: string | null; id: string; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotSee(role);
  const mayUndo = whyNotCorrect(role) === null;
  const store = useRead(() => (refused ? Promise.resolve(null) : readStore(code)), ["stores", code, "shelf"]);
  const q = useRead(() => (refused ? Promise.resolve(null) : readHistory(code, id)), ["stores", code, "history", id]);
  const [asking, setAsking] = useState<StockMovement | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [inDialog, setInDialog] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);

  const item = store.data && !isRefused(store.data) ? store.data.items.find((i) => i.id === id) ?? null : null;
  const off = isRefused(q.data) ? q.data.refused : null;
  const rows = q.data && !isRefused(q.data) ? q.data.movements : null;
  const unit = item?.unit ?? "";

  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="History" action={<Back onPress={onBack} />} />
        <NotYours title="History" sentence={refused ?? off!} />
      </Screen>
    );
  }

  async function undo(m: StockMovement) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setInDialog(null);
    try {
      await undoMovement(code, m.id);
      void cache.invalidateQueries({ queryKey: ["stores", code] });
      setAsking(null);
      setSaid({ title: "Undone", body: "Both rows stay on the history - the store's past is what somebody reads when the count is wrong.", tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) { stuck.current = true; setInDialog(unknownSaid("Not undone", e)); }
      else setInDialog(saidOf("Not undone", e));
    } finally {
      latch.current = stuck.current;
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); store.reload(); }}>
        <Head
          eyebrow="History" title={item?.name ?? "History"}
          under={item ? `${item.onHand} ${item.unit} on hand · every movement` : undefined}
          action={<Back onPress={onBack} />}
        />
        {!mayUndo ? <Text style={[body, { color: c.grey600 }]}>{UNDO_NOT_YOURS}</Text> : null}

        {q.data === undefined ? (
          q.error
            ? <LoadFailed title="The history did not load" error={q.error} onRetry={q.reload} offline="Could not reach the server. Check the connection, then try again." />
            : <Loading words="Reading the history…" />
        ) : !rows ? null : (
          <>
            <Stale error={q.error} />
            {rows.length === 0 ? (
              <Box><Empty compact title="Nothing has moved yet" description="A delivery, an issue or a count will show here." /></Box>
            ) : rows.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 8, borderWidth: 1,
                  paddingHorizontal: 14, paddingVertical: 12,
                  borderColor: m.reversed ? c.grey200 : m.isReversal ? c.grey300 : c.grey200,
                  borderStyle: m.isReversal && !m.reversed ? "dashed" : "solid",
                  backgroundColor: m.reversed ? c.grey50 : c.white, opacity: m.reversed ? 0.6 : 1,
                }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 }}>
                    <Text style={[t.label, { fontSize: 16, color: c.ink900 }]}>{rowTitle(m)}</Text>
                    <Text style={[t.label, t.tab, { ...face[500], color: rowCameIn(m) ? c.success : c.ink900 }]}>{rowQuantity(m, unit)}</Text>
                    {m.unitCost !== null ? <Text style={[t.label, t.tab, { color: c.grey500 }]}>at {rupees(m.unitCost)}/{unit}</Text> : null}
                    {m.reversed ? <Pill>Undone</Pill> : null}
                  </View>
                  <Text style={[body, { color: c.grey500 }]}>{rowLine(m)}</Text>
                  {m.note ? <Text style={[body, { color: c.grey600 }]}>{m.note}</Text> : null}
                  {rowFacts(m) ? <Text style={[body, t.tab, { color: c.grey600 }]}>{rowFacts(m)}</Text> : null}
                </View>
                {mayUndo && undoable(m) ? (
                  <Pressable
                    onPress={() => { setInDialog(null); setAsking(m); }} accessibilityRole="button" accessibilityLabel={`Undo this ${nounOf(m)}`}
                    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.red50 : "transparent" })}
                  >
                    <Undo2 size={16} color={c.grey500} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </>
        )}
        <View style={{ height: space.card }} />
      </Screen>

      {asking ? (() => {
        const ask = undoQuestion(asking, unit);
        return (
          <Dialog title={ask.title} onClose={() => setAsking(null)}>
            <Text style={[body, { fontSize: 16, lineHeight: 24, color: c.grey600 }]}>{ask.body}</Text>
            <InDialog said={inDialog} />
            <Foot>
              <Btn label="Cancel" tall grow onPress={() => setAsking(null)} />
              <Btn label={busy ? "Undoing…" : ask.button} variant="danger" tall grow disabled={busy} onPress={() => void undo(asking)} />
            </Foot>
          </Dialog>
        );
      })() : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}
