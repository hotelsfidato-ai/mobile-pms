import { useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus } from "lucide-react-native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { askFirst, Btn, Dialog, DialogFoot, ListRow, useDialogWrite, useRowWrite, Why } from "../banquet/setupKit";
import { Field, Input, Tick } from "../finance/Kit";
import { Back, Box, body, Empty, Loading, NotYours, Select, Stale, Toast, type Said } from "../guest-services/kit";
import { YellowChip } from "../purchasing/kit";
import { isRefused, readPriceList } from "./data";
import { rupees, SERVICE_WORDS, type LaundryService, type PriceItem } from "./docket";
import { LoadFailed } from "./kit";
import { addItem, setInUse, setPrice } from "./priceData";
import {
  addBody, addedWords, freeTyped, NO_ITEM, priceRows, PRICE_COLUMNS, priceSave, priceText, retireAct, retireAsk, retiredWords, SERVICES,
  unpricedCount, unpricedWords, whyNotAdd, whyNotPrice, type AddDraft,
} from "./prices";
import { whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE LAUNDRY PRICE LIST on a phone (lane U, 19 Nov) — the web's
   /h/:code/laundry/price-list (src/modules/laundry/pages/PriceList.tsx;
   picture pms-shots/new/n-h-laundry-price-list, as dev-gm).

   A line per item and service. NOTHING ON IT IS PRICED UNTIL SOMEBODY SAYS
   SO: "-" is nobody has decided, 0 (ticked Free) is somebody decided it is
   free. The price is typed in the row, as the web (eleven items are eleven
   numbers, not eleven dialogs), and saved when the box is left. The web's
   three-column table clips at phone width (its "On the list" column runs
   off the card): here each line is a row - its name and service, then the
   price, Free and Retire - unclipped. Retiring asks first. Refused offline.
   ══════════════════════════════════════════════════════════════════ */

export function PriceList({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotRead(role);
  const mayAdd = whyNotAdd(role);
  const mayPrice = whyNotPrice(role);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [adding, setAdding] = useState(false);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readPriceList(code)), ["laundry", code, "price-list"]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const items = q.data && !isRefused(q.data) ? q.data.items : null;
  const reread = () => void cache.invalidateQueries({ queryKey: ["laundry", code] });
  const row = useRowWrite(setSaid, reread);
  const tile = items ? unpricedWords(unpricedCount(items)) : null;

  const save = (item: PriceItem, typed: string, free: boolean) => {
    const out = priceSave(item, typed, free);
    if ("skip" in out) return;
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    void row.run(item.id, () => setPrice(code, item.id, out.body), { refused: "Not saved", done: "saved", where: "the price list" });
  };
  const retire = (item: PriceItem) => {
    const go = () => void row.run(item.id, () => setInUse(code, item.id, !item.isActive), {
      ok: retiredWords(item), refused: "Not changed", done: "changed", where: "the price list",
    });
    if (item.isActive) { const a = retireAsk(item); askFirst(a.title, a.body, "Retire", go); } else go();
  };

  /* Laundry switched off, or the gate (QA X-5): one sentence, no Add above it. */
  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Laundry price list" action={<Back onPress={onBack} />} />
        <NotYours title="Laundry" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head
          title="Laundry price list" action={<Back onPress={onBack} />}
          under="What this property charges for each thing it launders, item by item and service by service."
        />
        <View style={{ gap: 8, marginTop: -4, alignItems: "flex-start" }}>
          <Btn label="Add an item" variant="primary" icon={Plus} disabled={mayAdd != null} onPress={() => setAdding(true)} />
          <Why text={mayAdd} />
          <ExportButtons table={items ? { title: "Laundry price list", subtitle: hotel.name, columns: PRICE_COLUMNS, rows: priceRows(items) } : null} />
        </View>

        {tile ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY, backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100 }}>
            <YellowChip Icon={IndianRupee} />
            <Text style={[body, { flex: 1, color: c.ink900 }]}>{tile}</Text>
          </View>
        ) : null}

        {items === null ? (
          q.error ? (
            <LoadFailed
              title="The price list did not load" error={q.error} onRetry={q.reload}
              offline="This device is offline, so the price list cannot load. It loads by itself as soon as the connection is back."
            />
          ) : <Loading words="Reading the price list…" />
        ) : (
          <>
            <Stale error={q.error} />
            {items.length === 0 ? (
              <Box style={{ alignItems: "center", paddingBottom: 24 }}>
                <Empty
                  compact title="Nothing is on the price list yet"
                  description="A line is one thing and one service - a shirt washed, a saree dry-cleaned. Put the price in if this property has decided one; leave it blank if it has not, and it reads a dash until somebody does."
                />
                <Btn label="Add the first item" variant="primary" disabled={mayAdd != null} onPress={() => setAdding(true)} />
              </Box>
            ) : (
              <Box style={{ overflow: "hidden" }}>
                <Why text={mayPrice ? `  ${mayPrice}` : null} />
                {items.map((item, i) => (
                  <ItemRow
                    key={`${item.id}:${item.price}:${item.isActive}`} item={item} first={i === 0} refused={mayPrice} busy={row.busy(item.id)}
                    onSave={(typed, free) => save(item, typed, free)} onRetire={() => retire(item)}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </Screen>

      {adding ? (
        <AddDialog
          code={code} onClose={() => { setAdding(false); reread(); }}
          onDone={(words) => { setAdding(false); setSaid({ title: words, tone: "ok" }); reread(); }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── One line and its price (ItemRow): typed here, saved when the box is left ── */
function ItemRow({ item, first, refused, busy, onSave, onRetire }: {
  item: PriceItem; first: boolean; refused: string | null; busy: boolean;
  onSave: (typed: string, free: boolean) => void; onRetire: () => void;
}) {
  const [typed, setTyped] = useState(priceText(item.price));
  const [free, setFree] = useState(item.price === 0);
  const label = `Price for ${item.name}, ${SERVICE_WORDS[item.service].toLowerCase()}`;
  return (
    <ListRow first={first}>
      <Text style={[body, { flexBasis: "100%", color: item.isActive ? c.ink900 : c.grey600, ...face[500] }]}>
        {item.name}<Text style={{ color: c.grey500 }}> · {SERVICE_WORDS[item.service]}</Text>
      </Text>
      {item.isActive ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TextInput
            value={typed} onChangeText={setTyped} onEndEditing={() => onSave(typed, free)}
            editable={refused == null && !busy && !free} accessibilityLabel={label} accessibilityHint={refused ?? undefined}
            keyboardType="decimal-pad" inputMode="decimal" placeholder="-" placeholderTextColor={c.grey500} returnKeyType="done"
            style={[t.label, t.tab, {
              width: 100, minHeight: 44, textAlign: "right", borderWidth: 1, borderColor: c.grey300, borderRadius: 8, paddingHorizontal: 12,
              color: refused != null || free ? c.grey500 : c.ink900, backgroundColor: refused != null || free ? c.grey50 : c.white,
            }]}
          />
          <View style={{ width: 90 }}>
            <Tick
              label="Free" on={free} off={refused != null || busy}
              onChange={(on) => { setFree(on); setTyped(freeTyped(on)); onSave(freeTyped(on), on); }}
            />
          </View>
        </View>
      ) : (
        <Text style={[body, t.tab, { color: item.price === null ? c.grey500 : c.grey600 }]}>{rupees(item.price)}</Text>
      )}
      <View style={{ marginLeft: "auto" }}>
        <Btn
          label={busy ? "Saving…" : retireAct(item.isActive)} a11y={`${retireAct(item.isActive)}: ${item.name}, ${SERVICE_WORDS[item.service]}`}
          disabled={refused != null || busy} onPress={onRetire}
        />
      </View>
    </ListRow>
  );
}

/* ── Adding a line (AddDialog): what it is, what is done to it, and - only if decided - what it costs ── */
function AddDialog({ code, onClose, onDone }: { code: string; onClose: () => void; onDone: (words: string) => void }) {
  const [f, setF] = useState<AddDraft>(NO_ITEM);
  const set = (patch: Partial<AddDraft>) => setF((x) => ({ ...x, ...patch }));
  const [problem, setProblem] = useState<string | null>(null);
  const w = useDialogWrite("Not added", "added", "the price list");
  const add = () => {
    const out = addBody(f);
    if ("problem" in out) { setProblem(out.problem); return; }
    setProblem(null);
    void w.run(() => addItem(code, out.body), () => onDone(addedWords(out.body.name, out.body.price !== null)));
  };
  return (
    <Dialog title="Add an item to the price list" onClose={onClose}>
      <Field label="What is it">
        <Input label="What is it" value={f.name} onChange={(v) => set({ name: v })} placeholder="Shirt" />
      </Field>
      <Field label="What is done to it">
        <Select<LaundryService> label="What is done to it" value={f.service} options={SERVICES} onChange={(v) => set({ service: v })} />
      </Field>
      <Field
        label="Price"
        hint={"Leave it blank if this property has not decided one. It reads \"-\", never 0, and a guest's bag holding it cannot be charged. Tick Free only where the answer really is free."}
      >
        <Input label="Price" value={f.price} onChange={(v) => set({ price: v })} keyboard="decimal-pad" placeholder="Leave blank if nobody has priced it" off={f.free} tabular />
        <Tick label="Free" on={f.free} onChange={(on) => set({ free: on, price: freeTyped(on) })} />
      </Field>
      {problem ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{problem}</Text> : null}
      <DialogFoot act="Add it" busyWord="Adding…" ready w={w} onClose={onClose} onAct={add} />
    </Dialog>
  );
}
