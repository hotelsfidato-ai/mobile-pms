import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { HeldError } from "../../core/api";
import { c, t } from "../../core/theme";
import { notKnown, useRead, useStuck } from "../../core/ui";
import { addCompanion, readCompanions, readDesk, removeCompanion, said, saveCompanion, type Companion } from "./data";
import { deskGuestId, guestIdState, ID_TYPES, noGuestId, particularsPayload, sameVisit, type GuestId, type Particulars } from "./guestId";
import { GuestIdFields } from "./GuestIdFields";
import { body, Box, Button, Field, FormSheet, Pill, Toast, WEBSITE, type Said } from "./kit";
import type { DeskRules } from "./data";

/* ══════════════════════════════════════════════════════════════════
   EVERY ADULT IN THE ROOM — the web's StayCompanions.tsx (D27-382): one
   block on the check-in, the stay and a walk-in's card. Each person is
   saved on their own, so nobody missing can hold up a check-in. For the
   people who record a guest's ID: for anybody else the server refuses the
   read and the block draws nothing, as the web's. Refused offline (the
   web's tiers: not a held write).
   ══════════════════════════════════════════════════════════════════ */

const idWord = new Map<string, string>(ID_TYPES);
const peopleWords = (adults: number, recorded: number) => `${adults} adult${adults === 1 ? "" : "s"}, ${recorded} recorded`;

export function Companions({ code, stayId, today, rules, adults, leadAnswers }: {
  code: string; stayId: string; today: string; rules: DeskRules | undefined;
  /** The party as the check-in has it, before it is saved. */
  adults?: number | undefined;
  /** The lead's answers as the check-in has them, before they are saved. */
  leadAnswers?: Particulars;
}) {
  const key = ["front-desk", code, "companions", stayId];
  const q = useRead(() => readCompanions(code, stayId), key);
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Companion | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<Said | null>(null);
  if (!q.data?.companions) return null;

  const { recorded, lead, leadNationality, open, companions } = q.data;
  const expected = adults ?? q.data.adults;
  const remove = async (p: Companion) => {
    setRemoving(null);
    try {
      await removeCompanion(code, stayId, p.guestId);
      setToast({ title: "Removed", body: `${p.name} is off this stay, with their ID.`, tone: "ok" });
      void cache.invalidateQueries({ queryKey: ["front-desk", code] });
    } catch (e) {
      setToast({ title: "Not removed", body: said(e), tone: "bad" });
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Text style={[t.label, { color: c.ink900 }]} accessibilityRole="header">Adults in the room</Text>
        <Pill tone={recorded < expected ? "warning" : "neutral"}>{peopleWords(expected, recorded)}</Pill>
        {open ? <View style={{ marginLeft: "auto" }}><Button label="Add an adult" size="sm" onPress={() => setEditing("new")} /></View> : null}
      </View>
      <View style={{ paddingVertical: 8, borderBottomWidth: companions.length ? 1 : 0, borderBottomColor: c.grey100 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{lead} <Text style={[body, { color: c.grey600 }]}>· the guest on the booking</Text></Text>
      </View>
      {companions.map((p, i) => (
        <View key={p.guestId} style={{ paddingVertical: 8, gap: 6, borderBottomWidth: i < companions.length - 1 ? 1 : 0, borderBottomColor: c.grey100 }}>
          <View>
            <Text style={[t.label, { color: c.ink900 }]}>{p.name}</Text>
            <Text style={[t.label, body, t.tab, { color: c.grey600 }]}>
              {`${p.nationality} · `}
              {p.idNumber ? `${idWord.get(p.idType ?? "") ?? "ID"} ${p.idNumber}` : <Text style={{ color: c.yellow800 }}>ID not recorded</Text>}
            </Text>
          </View>
          {p.filed ? <Text style={[t.label, body, { color: c.grey600 }]}>Form III filed: corrected on the register.</Text>
            : removing === p.guestId ? (
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <Text style={[t.label, body, { color: c.grey600 }]}>Remove them and their ID?</Text>
                <Button label="Keep" size="sm" onPress={() => setRemoving(null)} />
                <Button label="Remove" size="sm" kind="danger" onPress={() => void remove(p)} />
              </View>
            ) : open ? (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Button label="Edit" size="sm" onPress={() => setEditing(p)} />
                <Button label="Remove" size="sm" kind="ghost" onPress={() => setRemoving(p.guestId)} />
              </View>
            ) : null}
        </View>
      ))}
      {editing ? (
        <AdultSheet
          code={code} stayId={stayId} today={today} rules={rules} person={editing === "new" ? null : editing}
          nationality={leadNationality} leadVisit={leadAnswers ?? q.data.leadVisit ?? {}}
          onDone={(s) => { setEditing(null); if (s) { setToast(s); void cache.invalidateQueries({ queryKey: ["front-desk", code] }); } }}
        />
      ) : null}
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

/** AddIdPhotoAtDesk.tsx (D27-210): the desk's roles only; the hotel's own
    sentence where it keeps no ID photos. Taking one needs a camera package. */
export function IdPhoto({ code }: { code: string }) {
  const desk = useRead(() => readDesk(code), ["front-desk", code, "desk"]);
  const photos = desk.data?.idPhotos;
  if (!photos) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.ink900 }]}>A photo of the ID</Text>
      {photos.on ? (
        <>
          <Button label="Add the photo" Icon={Camera} reason={WEBSITE} onPress={() => undefined} />
          <Text style={t.caption}>{WEBSITE}</Text>
        </>
      ) : <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>{photos.off}</Text>}
    </View>
  );
}

const NOT_ANSWERS = new Set(["guestId", "name", "nationality", "idType", "idNumber", "filed"]);

function AdultSheet({ code, stayId, today, rules, person, nationality, leadVisit, onDone }: {
  code: string; stayId: string; today: string; rules: DeskRules | undefined; person: Companion | null;
  nationality: string; leadVisit: Record<string, string | null | undefined>; onDone: (s: Said | null) => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  /* Edit starts with the document empty: an Aadhaar comes back masked. */
  const [id, setId] = useState<GuestId>(() => (person ? {
    ...noGuestId(person.nationality),
    particulars: Object.fromEntries(Object.entries(person).filter(([k, v]) => !NOT_ANSWERS.has(k) && typeof v === "string")) as Record<string, string>,
  } : deskGuestId(rules, nationality)));
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  /* Adding twice is two people on the stay, and the route reads no key: one
     tap, and none after an unknown outcome until the stay is seen (MFD-8).
     Edit sets the same details again: safe to repeat. */
  const latch = useRef(false);
  const once = useStuck();
  const s = guestIdState(id, today);
  const wrong = !name.trim() ? "A guest has a name." : s.wrong;

  const save = async () => {
    const p = particularsPayload(id.particulars);
    const input = {
      fullName: name.trim(), nationality: id.nationality,
      identity: { ...p.identity, ...(s.captured ? { idType: id.idType, idNumber: id.idNumber.trim() } : {}) },
      ...(s.foreign ? { visit: p.visit } : {}),
    };
    if (latch.current || once.isStuck()) return;
    latch.current = true;
    setBusy(true);
    try {
      await (person ? saveCompanion(code, stayId, person.guestId, input) : addCompanion(code, stayId, input));
      onDone({ title: person ? "Saved" : "Added", body: name.trim(), tone: "ok" });
    } catch (e) {
      setBusy(false);
      setBad(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : !person && once.stop(e) ? { ...notKnown("added", "the stay's guests", e), tone: "bad" }
        : { title: "Not saved", body: said(e), tone: "bad" });
    } finally { latch.current = false; }
  };

  return (
    <FormSheet
      title={person ? `Edit ${person.name}` : "Add an adult"} onClose={() => onDone(null)} said={bad} onSaid={setBad}
      description="Their own name and ID, as on the document. Saved on the stay at once; nothing here holds up the check-in."
      foot={(
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            <Button label="Cancel" size="lg" onPress={() => onDone(null)} />
            <Button label="Save" kind="primary" size="lg" busy={busy} reason={once.stuck ? notKnown("added", "the stay's guests").line : wrong} onPress={() => void save()} />
          </View>
          {wrong ? <Text style={t.caption}>{wrong}</Text> : null}
        </View>
      )}
    >
          <Field label="Full name" required><Box value={name} label="Full name" onChange={setName} /></Field>
          {person?.idNumber ? (
            <Text style={[t.label, body, { color: c.grey600 }]}>{`On record: ${idWord.get(person.idType ?? "") ?? "ID"} ${person.idNumber}. Fill in the document only to replace it.`}</Text>
          ) : null}
          <GuestIdFields value={id} onChange={setId} today={today} idsOff={rules?.idTypesOff ?? []} companion />
          {/* D27-386: a family's visit is one visit; the boxes stay theirs to change. */}
          {s.foreign && Object.keys(sameVisit({}, leadVisit)).length > 0 ? (
            <View style={{ flexDirection: "row" }}>
              <Button label="Same as the guest" size="sm" onPress={() => setId({ ...id, particulars: sameVisit(id.particulars, leadVisit) })} />
            </View>
          ) : null}
    </FormSheet>
  );
}
