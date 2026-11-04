import { useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { LoadFailed } from "../laundry/kit";
import { Back, Box, Btn, body, Empty, InDialog, Loading, NotYours, SectionHead, Select, Toast, saidOf, type Said } from "../guest-services/kit";
import { isRefused, readStore, saveStoreCount } from "./data";
import { ON_THE_WEBSITE, whyNotCorrect, whyNotSee } from "./roles";
import { bookWords, countBody, countedOf, difference, placesOf, rebook, sheetFor, startingStore, type SheetLine, type StockItem } from "./shelf";

/* ══════════════════════════════════════════════════════════════════
   COUNT A STORE — the web's CountSheet (pages/Stores.tsx 1560-1761,
   D25-15..17), which replaces the list. One store; every item, and an
   "- empty" line for a cylinder item; a place where crockery is in use is
   counted for its crockery. A count typed on a line shows that line's
   book and the difference; a line left blank is NOT counted and never
   sent as zero. Save writes one correction per difference, as whoever
   saves, "Count of <store>"; if a line's book moved since the sheet
   opened, the server refuses the whole save and names it, and that line
   takes the new book with its count cleared. No lock. Not pictured.
   Print the sheet is the website's (a printer). Offline the save is
   refused by send() with the web's sentence; nothing is held.
   ══════════════════════════════════════════════════════════════════ */

export function Count({ hotel, role, startStoreId, onBack }: {
  hotel: Hotel; role: string | null; startStoreId: string | null; onBack: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotSee(role) ?? whyNotCorrect(role);
  const q = useRead(() => (refused ? Promise.resolve(null) : readStore(code)), ["stores", code, "shelf"]);
  const list = q.data && !isRefused(q.data) ? q.data : null;
  const off = isRefused(q.data) ? q.data.refused : null;

  const places = placesOf(list ?? undefined);
  const inUseIds = new Set((list?.inUse ?? []).map((p) => p.id));
  const linesOf = (items: StockItem[], id: string) => sheetFor(items, id, inUseIds.has(id));

  const [storeId, setStoreId] = useState("");
  const [lines, setLines] = useState<SheetLine[] | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [mls, setMls] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [done, setDone] = useState<Said | null>(null);

  /* The book is taken when the sheet opens: once, from the first good read. */
  useEffect(() => {
    if (!list || lines !== null) return;
    const id = startingStore(placesOf(list), startStoreId);
    setStoreId(id);
    setLines(linesOf(list.items, id));
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Store" under="Count a store." action={<Back onPress={onBack} />} />
        <NotYours title="Count a store" sentence={refused ?? off!} />
      </Screen>
    );
  }

  const store = places.find((s) => s.id === storeId) ?? null;
  const out = lines ? countBody(lines, counts, mls, reasons) : { missing: "" };
  const typedCount = "lines" in out ? out.lines.length : 0;

  const pick = (id: string) => {
    if (!list) return;
    setStoreId(id); setLines(linesOf(list.items, id)); setCounts({}); setMls({}); setReasons({}); setSaid(null);
  };

  async function save() {
    if (latch.current || !store || !lines || !("lines" in out)) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await saveStoreCount(code, store.id, out.lines);
      void cache.invalidateQueries({ queryKey: ["stores", code] });
      /* The web goes back to the list with this said; the phone stays on the
         sheet, cleared, with the book read again - another store may be next. */
      setDone({
        title: `Count saved - ${store.name}`,
        body: `${res.recorded} ${res.recorded === 1 ? "difference" : "differences"} recorded, ${res.matched} matched the book.`, tone: "ok",
      });
      setCounts({}); setMls({}); setReasons({});
      const fresh = await readStore(code).catch(() => null);
      if (fresh && !isRefused(fresh)) setLines(linesOf(fresh.items, store.id));
    } catch (e) {
      setSaid(saidOf("Not saved", e));
      /* The lines whose book moved take the new book and lose their count. */
      try {
        const fresh = await readStore(code);
        if (!isRefused(fresh)) {
          const r = rebook(lines, linesOf(fresh.items, store.id));
          if (r.moved.length) {
            setLines(r.lines);
            setCounts((all) => Object.fromEntries(Object.entries(all).filter(([k]) => !r.moved.includes(k))));
            setMls((all) => Object.fromEntries(Object.entries(all).filter(([k]) => !r.moved.includes(k))));
          }
        }
      } catch { /* the refusal is already said */ }
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const saveButton = (
    <Btn
      label={busy ? "Saving…" : `Save the count${typedCount ? ` (${typedCount})` : ""}`} variant="primary"
      disabled={busy || !("lines" in out)} onPress={() => void save()}
    />
  );

  return (
    <View style={{ flex: 1 }}>
    <Screen refreshing={false} onRefresh={q.reload}>
      <Head title="Store" under="Count a store. Print the sheet, count the shelves, then type the counts in straight away." action={<Back onPress={onBack} />} />
      <SectionHead
        title="Count a store"
        note={`A line left blank is not counted. Each difference is saved as a correction with your name and "Count of ${store?.name ?? "the store"}".`}
      />
      <View style={{ gap: 6, marginTop: -8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Btn label="Print the sheet" icon={Printer} disabled onPress={() => undefined} />
          <Btn label="Cancel" onPress={onBack} />
          {saveButton}
        </View>
        <Text style={[t.caption, { color: c.grey600 }]}>Print the sheet: {ON_THE_WEBSITE}</Text>
      </View>

      {q.data === undefined ? (
        q.error
          ? <LoadFailed title="The store did not load" error={q.error} onRetry={q.reload} offline="This device is offline, so the store cannot load. It loads by itself as soon as the connection is back." />
          : <Loading words="Reading the store…" />
      ) : !list || !lines ? null : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={[t.label, { color: c.grey700 }]}>Store</Text>
            <View style={{ flex: 1, maxWidth: 260 }}>
              <Select<string> label="Store" value={storeId} onChange={pick} options={places.map((s) => ({ value: s.id, label: s.name }))} />
            </View>
          </View>
          <InDialog said={said} />
          {lines.length === 0 ? (
            <Box><Empty compact title="Nothing to count here" description={inUseIds.has(storeId) ? "Only crockery and cutlery is counted where it is in use." : "The store has no item yet."} /></Box>
          ) : (
            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
              {lines.map((l, n) => (
                <Line
                  key={l.key} line={l} first={n === 0}
                  full={counts[l.key] ?? ""} ml={mls[l.key] ?? ""} why={reasons[l.key] ?? ""}
                  onFull={(v) => setCounts((all) => ({ ...all, [l.key]: v }))}
                  onMl={(v) => setMls((all) => ({ ...all, [l.key]: v }))}
                  onWhy={(v) => setReasons((all) => ({ ...all, [l.key]: v }))}
                />
              ))}
            </View>
          )}
          {lines.length > 8 ? <View style={{ flexDirection: "row" }}>{saveButton}</View> : null}
        </>
      )}
    </Screen>
    <Toast said={done} onClose={() => setDone(null)} />
    </View>
  );
}

/** A box on the sheet: 44 tall, 16px type (no zoom), digits only. */
function Box44({ label, value, onChange, placeholder, width }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; width: number }) {
  return (
    <TextInput
      accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.grey400}
      keyboardType="decimal-pad" maxLength={10}
      style={{ width, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, textAlign: "right", ...face[500], ...t.tab }}
    />
  );
}

function Line({ line: l, first, full, ml, why, onFull, onMl, onWhy }: {
  line: SheetLine; first: boolean; full: string; ml: string; why: string;
  onFull: (v: string) => void; onMl: (v: string) => void; onWhy: (v: string) => void;
}) {
  const n = countedOf(l, full, ml);
  const d = n === null || !Number.isFinite(n) ? null : difference(n, l.book);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t.label, { color: c.ink900 }]}>{l.name}</Text>
          <Text style={t.caption}>{l.sizeMl ? `Full ${l.unit}s of ${l.sizeMl} ml, and the ml in the open one` : l.unit}</Text>
        </View>
        <Box44 label={`Counted, ${l.name}, in ${l.unit}`} value={full} onChange={onFull} width={l.sizeMl ? 72 : 96} {...(l.sizeMl ? { placeholder: "Full" } : {})} />
        {l.sizeMl ? <Box44 label={`Open ${l.unit}, ${l.name}, in ml`} value={ml} onChange={onMl} placeholder="ml" width={72} /> : null}
      </View>
      {/* THE BOOK SHOWS ONCE A COUNT IS TYPED (D25-16). */}
      {n !== null ? (
        <>
          <Text style={[body, t.tab, { color: Number.isFinite(n) ? c.grey600 : c.red700 }]} accessibilityLiveRegion="polite">{bookWords(l, n)}</Text>
          {d !== null && d !== 0 ? (
            <TextInput
              accessibilityLabel={`Why, ${l.name}`} placeholder="Why, if known" placeholderTextColor={c.grey400} value={why} onChangeText={onWhy} maxLength={200}
              style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500] }}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
