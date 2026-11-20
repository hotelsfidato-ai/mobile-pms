import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Plus, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Switch, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Field, Input, Tick } from "../finance/Kit";
import { Box, body, Loading, Pill, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { isRefused, readSetup } from "./data";
import { NotAvailable } from "./kit";
import { figure, type Hall, type Package } from "./rules";
import {
  freeRate, hallBody, hallDraft, hallLine, hallProblems, HALLS_WHO, NO_PACKAGE, packageBody, packageLine, PACKAGES_NOTE, PACKAGES_WHO,
  switchedWords, whyNotReadSetup, whyNotSetUp, type HallDraft, type PackageDraft,
} from "./setup";
import { addHall, addPackage, changeHall, switchPackage } from "./setupData";
import { askFirst, Btn, CardHead, Dialog, DialogFoot, ListRow, useDialogWrite, useRowWrite, Why } from "./setupKit";

/* ══════════════════════════════════════════════════════════════════
   HALLS AND PACKAGES on a phone (lane U, 19 Nov) — the web's
   /h/:code/banquet/setup (src/modules/banquet/pages/BanquetSetup.tsx;
   picture pms-shots/new/n-h-banquet-setup, as dev-gm).

   NOTHING HERE IS SHIPPED: no hall, no package, no price. A usual rate is an
   offer on the booking form, never a price; a hall with none reads "no usual
   rate". Two cards: Halls (add, edit) and Packages (add, switch off or on -
   never changed, D27-305). Every control is the HALLS rule's (room_config
   edit): grey for the rest, with the API's sentence and the web's own note.
   Switching a package off asks first. Everything is refused offline.
   ══════════════════════════════════════════════════════════════════ */

export function Setup({ hotel, role, onDiary }: { hotel: Hotel; role: string | null; onDiary: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotReadSetup(role);
  const maySetUp = whyNotSetUp(role);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [hall, setHall] = useState<Hall | "new" | null>(null);
  const [adding, setAdding] = useState(false);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readSetup(code)), ["banquet", code, "setup"]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const d = q.data && !isRefused(q.data) ? q.data : null;
  /* The diary names the halls too: both are read again. */
  const reread = () => void cache.invalidateQueries({ queryKey: ["banquet", code] });
  const row = useRowWrite(setSaid, reread);

  const flip = (p: Package, on: boolean) =>
    void row.run(p.id, () => switchPackage(code, p.id, on), {
      ok: switchedWords(p.name, on), refused: "Not changed", done: "changed", where: "the packages",
    });

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Halls and packages" />
        <NotAvailable what="Halls and packages" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Halls and packages" under="Nothing here is created for you, and no price is ever assumed." />
        <View style={{ gap: 4, marginTop: -4, alignItems: "flex-start" }}>
          <Btn label="Diary" icon={ArrowLeft} onPress={onDiary} />
          <Why text={maySetUp} />
        </View>

        {d === null ? (
          q.error
            ? (
              <LoadFailed
                title="The halls and packages did not load" onRetry={q.reload}
                error={`${q.error} Try again, and tell the manager if it keeps happening.`}
                offline="The server could not be reached, and this device has no saved copy to show. Check the connection, then try again."
              />
            )
            : <Loading words="Reading the halls and packages…" />
        ) : (
          <>
            <Stale error={q.error} />

            <Box style={{ overflow: "hidden" }}>
              <CardHead
                Icon={Building2} title="Halls" note={maySetUp ? HALLS_WHO : null}
                action={<Btn label="Add a hall" icon={Plus} disabled={maySetUp != null} onPress={() => setHall("new")} />}
              />
              {d.venues.length === 0 ? (
                <Text style={[body, { color: c.grey500, textAlign: "center", paddingHorizontal: 16, paddingVertical: 24 }]}>
                  No halls yet. Enter the ones this property actually has.
                </Text>
              ) : d.venues.map((v, i) => (
                <ListRow key={v.id} first={i === 0}>
                  <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <Text style={[body, { color: c.ink900, ...face[500] }]}>{v.name}</Text>
                      {!v.isActive ? <Pill>Not in use</Pill> : null}
                    </View>
                    <Text style={[body, t.tab, { color: c.grey500 }]}>{hallLine(v)}</Text>
                  </View>
                  <Btn label="Edit" a11y={`Edit ${v.name}`} disabled={maySetUp != null} onPress={() => setHall(v)} />
                </ListRow>
              ))}
            </Box>

            <Box style={{ overflow: "hidden" }}>
              <CardHead
                Icon={UtensilsCrossed} title="Packages" note={`${PACKAGES_NOTE}${maySetUp ? PACKAGES_WHO : ""}`}
                action={<Btn label="Add a package" icon={Plus} disabled={maySetUp != null} onPress={() => setAdding(true)} />}
              />
              {d.packages.length === 0 ? (
                <Text style={[body, { color: c.grey500, textAlign: "center", paddingHorizontal: 16, paddingVertical: 24 }]}>
                  None. Packages are optional - a function can be fed off-menu, or from the till, or not at all.
                </Text>
              ) : d.packages.map((p, i) => (
                <ListRow key={p.id} first={i === 0}>
                  <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <Text style={[body, { color: c.ink900, ...face[500] }]}>{p.name}</Text>
                      {p.mealType ? <Pill>{p.mealType}</Pill> : null}
                      {!p.isActive ? <Pill>Off</Pill> : null}
                    </View>
                    <Text style={[body, t.tab, { color: c.grey500 }]}>{packageLine(p)}</Text>
                  </View>
                  <View style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                    <Switch
                      value={p.isActive} disabled={maySetUp != null || row.busy(p.id)}
                      onValueChange={(on) => (on ? flip(p, true) : askFirst(
                        `Switch off ${p.name}?`,
                        "It is not offered for new catering from now. Functions that have it keep it exactly as sold; it can be switched on again.",
                        "Switch off", () => flip(p, false),
                      ))}
                      accessibilityLabel={`Offer ${p.name}`} accessibilityHint={maySetUp ?? undefined}
                      trackColor={{ true: c.success, false: c.grey300 }} thumbColor={c.white}
                    />
                  </View>
                </ListRow>
              ))}
            </Box>
          </>
        )}
      </Screen>

      {hall ? (
        <HallDialog
          code={code} hall={hall === "new" ? null : hall} onClose={() => { setHall(null); reread(); }}
          onDone={(words) => { setHall(null); setSaid({ title: words, tone: "ok" }); reread(); }}
        />
      ) : null}
      {adding ? (
        <PackageDialog
          code={code} onClose={() => { setAdding(false); reread(); }}
          onDone={() => { setAdding(false); setSaid({ title: "Package added", tone: "ok" }); reread(); }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── Add a hall, edit one: the web's VenueDialog ── */
function HallDialog({ code, hall, onClose, onDone }: { code: string; hall: Hall | null; onClose: () => void; onDone: (words: string) => void }) {
  const [f, setF] = useState<HallDraft>(hallDraft(hall));
  const set = (patch: Partial<HallDraft>) => setF((x) => ({ ...x, ...patch }));
  const w = useDialogWrite("Not saved", hall ? "saved" : "added", "the halls");
  const sent = hallBody(f);
  const bad = hallProblems(f);
  return (
    <Dialog title={hall ? "Edit the hall" : "Add a hall"} onClose={onClose}>
      <Field label="Name" required>
        <Input label="Name" value={f.name} onChange={(v) => set({ name: v })} placeholder="Emerald Hall" />
      </Field>
      <Field label="Seated capacity" hint={bad.seated ?? "Leave blank if it has not been measured."}>
        <Input label="Seated capacity" value={f.seated} onChange={(v) => set({ seated: v })} keyboard="number-pad" placeholder="-" tabular />
      </Field>
      <Field label="Standing capacity" {...(bad.floating ? { hint: bad.floating } : {})}>
        <Input label="Standing capacity" value={f.floating} onChange={(v) => set({ floating: v })} keyboard="number-pad" placeholder="-" tabular />
      </Field>
      <Field
        label="Usual rate"
        hint={bad.rate ?? "Optional, and only ever offered on the booking form. What gets billed is what somebody agrees for the function, so changing this cannot reprice a booking already made."}
      >
        <Input label="Usual rate" value={f.rate} onChange={(v) => set({ rate: v })} keyboard="decimal-pad" placeholder="-" off={f.free} tabular />
        <Tick label="Free" on={f.free} onChange={(on) => set(freeRate(on))} />
      </Field>
      <Field label="Notes">
        <Input label="Notes" value={f.notes} onChange={(v) => set({ notes: v })} multiline />
      </Field>
      <DialogFoot
        act="Save" busyWord="Saving…" ready={sent !== null} w={w} onClose={onClose}
        onAct={() => void w.run(() => (hall ? changeHall(code, hall.id, sent!) : addHall(code, sent!)), () => onDone(hall ? "Saved" : "Hall added"))}
      />
    </Dialog>
  );
}

/* ── Add a package: the web's PackageDialog (never changed once added) ── */
function PackageDialog({ code, onClose, onDone }: { code: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<PackageDraft>(NO_PACKAGE);
  const set = (patch: Partial<PackageDraft>) => setF((x) => ({ ...x, ...patch }));
  const w = useDialogWrite("Not added", "added", "the packages");
  const sent = packageBody(f);
  return (
    <Dialog
      title="Add a package" onClose={onClose}
      description="A package can name what is served without carrying a price - that is how most banquet food is sold here."
    >
      <Field label="Name" required>
        <Input label="Name" value={f.name} onChange={(v) => set({ name: v })} placeholder="Dinner buffet" />
      </Field>
      <Field label="Rate a head" hint={figure(f.rate) === "bad" ? "Not a figure." : "Optional."}>
        <Input label="Rate a head" value={f.rate} onChange={(v) => set({ rate: v })} keyboard="decimal-pad" placeholder="-" off={f.free} tabular />
        <Tick label="Free" on={f.free} onChange={(on) => set(freeRate(on))} />
      </Field>
      <Field label="Kind" hint="Veg, non-veg, jain…">
        <Input label="Kind" value={f.mealType} onChange={(v) => set({ mealType: v })} />
      </Field>
      <Field label="What is in it">
        <Input label="What is in it" value={f.description} onChange={(v) => set({ description: v })} multiline />
      </Field>
      <DialogFoot act="Add" busyWord="Adding…" ready={sent !== null} w={w} onClose={onClose} onAct={() => void w.run(() => addPackage(code, sent!), onDone)} />
    </Dialog>
  );
}
