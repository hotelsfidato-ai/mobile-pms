import { useQueryClient } from "@tanstack/react-query";
import { PackageSearch, Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { clearLost, listLost, logLost } from "./data";
import {
  Back, Box, Btn, body, Dialog, Empty, Failed, Field, Foot, IconChip, InDialog, Input, Loading, NotYours, Pill,
  Segmented, Stale, saidOf, type Said,
} from "./kit";
import { CLEAR_REFUSED, whyNotLost } from "./roles";
import { clearedLine, foundLine, type LostItem } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   LOST PROPERTY on a phone — the web's /h/:code/lost-property
   (src/modules/guest-services/pages/LostProperty.tsx; picture
   pms-shots/new/n-h-lost-property). The desk and housekeeping log what was
   found; only the desk marks it returned (to whom) or disposed (why): the
   server says which (`mayClear`). Days kept shown; nothing goes by itself.
   Where the phone differs (AGENTS rule 1): for housekeeping the web hides
   Returned and Disposed; the phone shows them grey, with the API's sentence.
   ══════════════════════════════════════════════════════════════════ */

type View_ = "kept" | "cleared";

export function LostProperty({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotLost(role);
  const [view, setView] = useState<View_>("kept");
  const [logging, setLogging] = useState(false);
  const [clearing, setClearing] = useState<{ item: LostItem; action: "returned" | "disposed" } | null>(null);
  const [pulled, setPulled] = useState(false);

  const list = useRead(() => (refused ? Promise.resolve(null) : listLost(code, view)), ["guest-services", code, "lost-property", view]);
  const refresh = () => void cache.invalidateQueries({ queryKey: ["guest-services", code, "lost-property"] });
  const items = list.data?.items ?? [];
  const mayClear = list.data?.mayClear === true;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head title="Lost property" under="What was found, kept until it goes back to its owner or is disposed of." action={<Back onPress={onBack} />} />
        <View style={{ flexDirection: "row", marginTop: -4, marginBottom: 8 }}>
          <Btn label="Log an item" variant="primary" icon={Plus} disabled={refused != null} onPress={() => setLogging(true)} />
        </View>
        <View style={{ marginBottom: 8 }}>
          <Segmented<View_>
            label="Kept or cleared" value={view} onChange={setView}
            options={[{ value: "kept", label: "Kept" }, { value: "cleared", label: "Returned or disposed" }]}
          />
        </View>

        {refused ? <NotYours title="Lost property" sentence={refused} />
          : list.data === undefined
            ? (list.error ? <Failed title="Lost property did not load" error={list.error} onRetry={list.reload} /> : <Loading words="Reading lost property…" />)
            : items.length === 0 ? (
              <Empty
                title={view === "kept" ? "Nothing kept" : "Nothing returned or disposed of yet"}
                description={view === "kept"
                  ? "An item shows here once the desk or housekeeping logs it."
                  : "An item shows here once the desk returns it or disposes of it."}
              />
            ) : (
              <>
                <Stale error={list.error} />
                {items.map((i) => (
                  <Box key={i.id} style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <IconChip Icon={PackageSearch} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <Text style={[body, { color: c.ink900 }]}>{i.what}</Text>
                          {i.status === "returned" ? <Pill tone="success">Returned</Pill> : null}
                          {i.status === "disposed" ? <Pill>Disposed of</Pill> : null}
                        </View>
                        <Text style={[body, { color: c.grey500, marginTop: 4 }]}>{foundLine(i)}</Text>
                        {i.keptWhere ? <Text style={[body, { marginTop: 2 }]}>Kept: {i.keptWhere}</Text> : null}
                        {clearedLine(i) ? <Text style={[body, { marginTop: 2 }]}>{clearedLine(i)}</Text> : null}
                      </View>
                    </View>
                    {i.status === "kept" ? (
                      <View style={{ gap: 4, paddingLeft: 42 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          <Btn label="Returned" a11y={`Returned: ${i.what}`} disabled={!mayClear} onPress={() => setClearing({ item: i, action: "returned" })} />
                          <Btn label="Disposed" a11y={`Disposed: ${i.what}`} variant="ghost" disabled={!mayClear} onPress={() => setClearing({ item: i, action: "disposed" })} />
                        </View>
                        {!mayClear ? <Text style={[t.caption, { color: c.grey600 }]}>{CLEAR_REFUSED}</Text> : null}
                      </View>
                    ) : null}
                  </Box>
                ))}
              </>
            )}
      </Screen>

      {logging ? <LogDialog code={code} onClose={() => { setLogging(false); refresh(); }} onDone={refresh} /> : null}
      {clearing ? <ClearDialog code={code} {...clearing} onClose={() => setClearing(null)} onDone={refresh} /> : null}
    </View>
  );
}

function LogDialog({ code, onClose, onDone }: { code: string; onClose: () => void; onDone: () => void }) {
  const [what, setWhat] = useState("");
  const [foundWhere, setFoundWhere] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [keptWhere, setKeptWhere] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  /* A second tap is a second item, and the route reads no key: latched at
     the tap, and after an unknown outcome no more taps until this is closed
     and the items kept read again (MGS-3). */
  const latch = useRef(false);
  const once = useStuck();

  async function save() {
    if (latch.current || once.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await logLost(code, { what, foundWhere, roomNumber, keptWhere });
      onClose();
      onDone();
    } catch (e) {
      setSaid(once.stop(e) ? { ...notKnown("logged", "the items kept once this is closed", e), tone: "bad" } : saidOf("Not logged", e));
      setBusy(false);
    } finally {
      latch.current = false;
    }
  }

  return (
    <Dialog title="Log an item" description="What was found, and where." onClose={onClose}>
      <Field label="What it is" required>
        <Input label="What it is" maxLength={200} value={what} onChangeText={setWhat} autoFocus />
      </Field>
      <Field label="Where it was found" required>
        <Input label="Where it was found" maxLength={200} value={foundWhere} onChangeText={setFoundWhere} />
      </Field>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Room" hint="If it was in one.">
            <Input label="Room" autoCapitalize="characters" maxLength={10} value={roomNumber} onChangeText={setRoomNumber} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Where it is kept">
            <Input label="Where it is kept" maxLength={200} value={keptWhere} onChangeText={setKeptWhere} />
          </Field>
        </View>
      </View>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label="Log it" variant="primary" tall grow disabled={busy || once.stuck || !what.trim() || !foundWhere.trim()} onPress={() => void save()} />
      </Foot>
    </Dialog>
  );
}

function ClearDialog({ code, item, action, onClose, onDone }: {
  code: string; item: LostItem; action: "returned" | "disposed"; onClose: () => void; onDone: () => void;
}) {
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const label = action === "returned" ? "Who it went to" : "Why it was disposed of";

  async function finish() {
    setBusy(true);
    setSaid(null);
    try {
      await clearLost(code, item.id, action, words.trim());
      onClose();
      onDone();
    } catch (e) {
      setSaid(saidOf("Not changed", e));
      setBusy(false);
    }
  }

  return (
    <Dialog title={item.what} {...(item.keptWhere ? { description: `Kept: ${item.keptWhere}` } : {})} onClose={onClose}>
      <Field label={label} required>
        <Input label={label} maxLength={200} value={words} onChangeText={setWords} autoFocus />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Back" tall grow onPress={onClose} />
        <Btn
          label={action === "returned" ? "Mark returned" : "Mark disposed"} variant={action === "returned" ? "primary" : "danger"}
          tall grow disabled={busy || !words.trim()} onPress={() => void finish()}
        />
      </Foot>
    </Dialog>
  );
}
