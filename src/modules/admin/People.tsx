import { useQueryClient } from "@tanstack/react-query";
import { Building2, Info, UserPlus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import { c, face, t } from "../../core/theme";
import { Head, Screen, s as core, keys, mail, notKnown, ripple, useRead } from "../../core/ui";
import {
  amendStaff, createStaff, deactivateStaff, grantAccess, listPeople, reactivateStaff, revokeAccess, setHomeScreen,
  setStaffPassword, switchTwoStepOff,
} from "./data";
import {
  Btn, Choose, Empty, Failed, Field, Foot, Loading, PasswordField, Pill, Refused, Segmented, Sheet, Stale, Toast,
  SwitchRow, body, confirm, saidOf, useAct, useSaid, useStop, type Said, type Stop,
} from "./kit";
import { minPasswordFor, refusedScreen, roleLabel, roleWhat } from "./roles";
import {
  HOME_SCREENS, addReady, addedWords, chosenRole, grantable, mayGrant, mayTake, peopleLine, placesOf, strandedLine,
  strandedOf, type AdminStaff, type RosterPlace,
} from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   PEOPLE on a phone — the web's /people (src/modules/admin/pages/
   People.tsx; picture pms-shots/all/22-across-properties-people, as
   dev-gm). Who works where and as what, and the acts on them: Add
   somebody, Give a property, the ✕ that takes one away, Password, Edit,
   Two-step off, Deactivate and Bring them back.

   THIS CHANGES WHO MAY DO WHAT, so it is exactly the web's, never wider:
   each button is offered only where the server's own row says it may be
   taken (`mayEdit`, `maySwitch`, `maySetPassword`, `mayTwoStepOff`), the
   pickers offer only `rosterAt` (the places the signed-in person runs,
   with the roles they may give there), and the ✕ only a place they run in
   a role they could give (nobody removes somebody above them). The server
   asks again on every write; its refusal is its own sentence. Every write
   is refused offline with the web's sentence (send(), data.ts). Removing a
   person's property and deactivating them ask first, with the phone's own
   dialog; an unknown outcome takes no more taps until the list is read
   again (useAct, MEMORY 16).
   ══════════════════════════════════════════════════════════════════ */

type Open = { kind: "add" } | { kind: "grant" | "password" | "edit" | "two-step"; person: AdminStaff } | null;

export function People({ hotel, role, who }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedScreen(role, "people");
  const { said, say, close } = useSaid();
  const [pulled, setPulled] = useState(false);
  const [showing, setShowing] = useState<"all" | "off">("all");
  const [open, setOpen] = useState<Open>(null);
  /* The start of the last read that came back: a card stuck before it is free again (useAct). */
  const [seenAt, setSeenAt] = useState(0);
  const key = ["admin", code, "people"] as const;
  const list = useRead(async () => {
    if (refused) return null;
    const started = Date.now();
    const answer = await listPeople();
    setSeenAt(started);
    return answer;
  }, key);
  const refresh = () => void cache.invalidateQueries({ queryKey: key });
  /* The sheets' stop, kept here so closing a sheet does not free it (MADM-3). */
  const stop = useStop(seenAt);

  const groupAdmin = who.scope.isGroupAdmin;
  const me = who.scope.staffId;
  /* Which places are test hotels: GET /api/hotels's testOf (D27-296). */
  const testCodes = new Set(who.hotels.filter((h) => h.testOf).map((h) => h.code));
  const rows = list.data?.staff ?? [];
  const places = placesOf(list.data?.rosterAt ?? [], testCodes, groupAdmin);
  const mayAdd = groupAdmin || places.all.length > 0;
  const switchedOff = rows.filter((p) => !p.isActive).length;
  const listed = showing === "off" ? rows.filter((p) => !p.isActive) : rows;
  const stranded = strandedOf(rows);

  const table = list.data ? {
    title: "People", subtitle: `${hotel.name} · showing ${showing === "off" ? "switched off" : "everybody"}`,
    columns: ["Name", "Email", "Phone", "Every property", "Works at", "Can sign in", "Active"],
    rows: listed.map((p) => [p.name, p.email, p.phone ?? "-", p.isGroupAdmin ? "Yes" : "No",
      p.access.map((a) => `${a.code} ${roleLabel(a.role)}`).join(", "), p.canSignIn ? "Yes" : "No", p.isActive ? "Yes" : "Switched off"]),
  } : null;

  const done = (s: Said) => { say(s); refresh(); };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head title="People" under={list.data ? peopleLine(rows, true, mayAdd) : undefined} />
        {refused ? <Refused sentence={refused} /> : list.data === undefined
          ? (list.error ? <Failed error={list.error} onRetry={list.reload} /> : <Loading what="the people" />)
          : list.data === null ? null : (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -8 }}>
                <Btn label="Add somebody" variant="primary" disabled={!mayAdd || stop.stuck} onPress={() => setOpen({ kind: "add" })}
                  icon={<UserPlus size={16} color={mayAdd ? c.white : c.grey500} />} />
              </View>
              {stop.stuck ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{notKnown("done", "the list of people").line} Reading it again…</Text> : null}
              <ExportButtons table={table} />
              <Stale error={list.error} />
              {stranded.length > 0 ? (
                <View style={[core.card, { backgroundColor: c.yellow50, borderColor: c.yellow100 }]}>
                  <Text style={[body, { color: c.ink900 }]}>
                    <Text style={face[600]}>{strandedLine(stranded)}</Text>
                    {` - ${stranded.map((p) => p.name).join(", ")}. Give them a property below. Until then the app opens empty for them, which reads as a fault rather than a setting.`}
                  </Text>
                </View>
              ) : null}
              {rows.length === 0 ? (
                <Empty title="Nobody has been added"
                  description="Add the people who work here with the email address they will sign in with. Access is given per property, so somebody at one hotel never sees another's guests."
                  action={mayAdd ? <Btn label="Add the first" onPress={() => setOpen({ kind: "add" })} /> : undefined} />
              ) : (
                <>
                  {switchedOff > 0 ? (
                    <Segmented label="Who is shown" value={showing} onChange={setShowing}
                      options={[{ value: "all", label: "Everybody" }, { value: "off", label: `Switched off (${switchedOff})` }]} />
                  ) : null}
                  {listed.map((p) => (
                    <PersonCard key={p.id} person={p} places={places.all} testCodes={testCodes} me={me} seenAt={seenAt} sheetsStuck={stop.stuck}
                      onOpen={(kind) => setOpen({ kind, person: p })} onSaid={say} onDone={done} />
                  ))}
                </>
              )}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Info size={14} color={c.grey500} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Foot>Adding somebody creates their sign-in account and sets the password you give. Tell it to them - nothing is emailed. The address has to be the one they actually use: it is what they sign in with, and a typo means a person who cannot get in.</Foot>
                </View>
              </View>
            </>
          )}
      </Screen>
      {open?.kind === "add" ? (
        <AddPerson stop={stop} places={places.real} testPlaces={groupAdmin ? places.test : null} placeRequired={!groupAdmin}
          onClose={() => { setOpen(null); refresh(); }} onSaid={say} />
      ) : null}
      {open?.kind === "grant" ? (
        <Grant stop={stop} person={open.person} places={places.all} testCodes={testCodes} onClose={() => { setOpen(null); refresh(); }} onSaid={say} />
      ) : null}
      {open?.kind === "password" ? <Password stop={stop} person={open.person} onClose={() => { setOpen(null); refresh(); }} onSaid={say} /> : null}
      {open?.kind === "edit" ? <Edit stop={stop} person={open.person} onClose={() => { setOpen(null); refresh(); }} onSaid={say} /> : null}
      {open?.kind === "two-step" ? <TwoStepOff stop={stop} person={open.person} onClose={() => { setOpen(null); refresh(); }} onSaid={say} /> : null}
      <Toast said={said} onClose={close} />
    </View>
  );
}

/* ── One person, and what they can reach (PersonCard) ─────────────── */

function PersonCard({ person, places, testCodes, me, seenAt, sheetsStuck, onOpen, onSaid, onDone }: {
  person: AdminStaff; places: RosterPlace[]; testCodes: Set<string>; me: string; seenAt: number; sheetsStuck: boolean;
  onOpen: (kind: "grant" | "password" | "edit" | "two-step") => void; onSaid: (s: Said) => void; onDone: (s: Said) => void;
}) {
  const act = useAct(seenAt);
  const off = act.busy || act.stuck;
  /* A sheet's write whose outcome is unknown greys the sheets' openers too, until the list is read again. */
  const shut = off || sheetsStuck;
  const lost = (what: string) => (e: unknown) => onDone({ title: notKnown(what, "this person's card").title, body: notKnown(what, "this person's card", e).body, tone: "bad" });

  /* D27-117: the ✕ asks first, in the web's words (ConfirmRemoveAccess.tsx). */
  const take = async (where: string) => {
    if (off) return;
    const yes = await confirm(`Remove ${person.name} from ${where}?`,
      `They can no longer work at ${where}. Their account stays, and their name stays on everything they did there.`, "Remove");
    if (!yes) return;
    await act.run(() => revokeAccess(person.id, where), {
      ok: () => onDone({ title: `${person.name} no longer works at ${where}`, tone: "ok" }),
      no: (e) => { onSaid(saidOf(e, "Not removed")); },
      unknown: lost("removed"),
    });
  };
  /* The web deactivates at one tap; switching a person off asks first on the phone (BRIEF-T3), in the
     words the web says after it (MODULE.md, difference 3). */
  const deactivate = async () => {
    if (off) return;
    const yes = await confirm(`Deactivate ${person.name}?`,
      "They can no longer sign in. Their name stays on everything they did - the audit log would be unreadable without it.", "Deactivate");
    if (!yes) return;
    await act.run(() => deactivateStaff(person.id), {
      ok: (r) => onDone(r.warning ? { title: `${person.name} is deactivated`, body: r.warning, tone: "bad" }
        : { title: `${person.name} can no longer sign in`, body: "Their name stays on everything they did - the audit log would be unreadable without it.", tone: "ok" }),
      no: (e) => onSaid(saidOf(e, "Not deactivated")),
      unknown: lost("deactivated"),
    });
  };
  const bringBack = () => act.run(() => reactivateStaff(person.id), {
    /* The warning is shown, not swallowed: active with no sign-in account reaches a page that accepts nothing. */
    ok: (r) => onDone(r.warning ? { title: `${person.name} is active again`, body: r.warning, tone: "bad" } : { title: `${person.name} can sign in again`, tone: "ok" }),
    no: (e) => onSaid(saidOf(e, "Not reactivated")),
    unknown: lost("reactivated"),
  });

  const grants = mayGrant(person, places);
  return (
    <View style={[core.card, { gap: 12 }, !person.isActive && { opacity: 0.6 }]}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Text style={[t.heading, { fontSize: 16, ...face[500] }]}>{person.name}</Text>
          {person.isGroupAdmin ? <Pill tone="warning">Every property</Pill> : null}
          {!person.isActive ? <Pill tone="neutral">Switched off</Pill> : null}
          {person.isActive && !person.canSignIn ? <Pill tone="danger" dot>No password yet</Pill> : null}
          {person.twoStepOn ? <Pill tone="success">Two-step on</Pill> : null}
        </View>
        <Pressable onPress={() => mail(person.email)} accessibilityRole="link" accessibilityLabel={`Email ${person.email}`}
          hitSlop={8} style={{ alignSelf: "flex-start", minHeight: 24, justifyContent: "center" }}>
          <Text style={[body, { color: c.grey500 }]}>{person.email}</Text>
        </Pressable>
      </View>

      {person.isGroupAdmin ? (
        <Text style={[body, { color: c.grey600 }]}>A group administrator reaches every property, including ones added later. Property grants do not apply to them.</Text>
      ) : person.isActive && !person.canSignIn ? (
        <Text style={[body, { color: c.red700 }]}>No sign-in account yet - they cannot get in at all. Set a password and they can.</Text>
      ) : person.access.length === 0 ? (
        <Text style={[body, { color: c.grey500 }]}>- no property yet, so this account opens empty</Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {person.access.map((a) => {
            const x = mayTake(person, a, me, places);
            return (
              <View key={a.code} style={{ flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 999, backgroundColor: c.grey100, paddingLeft: 10, paddingRight: x ? 0 : 10, minHeight: 30 }}>
                <Text style={[body, { color: c.ink900 }]}>
                  <Text style={[face[600], t.tab]}>{a.code}</Text>
                  <Text style={{ color: c.grey500 }}> · {roleLabel(a.role)}</Text>
                </Text>
                {testCodes.has(a.code) ? <Pill tone="warning">TEST</Pill> : null}
                {x ? (
                  <Pressable onPress={() => void take(a.code)} disabled={off} accessibilityRole="button" android_ripple={{ ...ripple, borderless: true }}
                    accessibilityLabel={`Remove ${a.code} from ${person.name}`} accessibilityState={{ disabled: off }}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginVertical: -7 }}>
                    <X size={15} color={off ? c.grey300 : c.grey500} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {person.isActive ? (
        (grants || person.maySetPassword || person.mayEdit || person.mayTwoStepOff || person.maySwitch) ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, borderTopWidth: 1, borderColor: c.grey100, paddingTop: 12 }}>
            {grants ? <Btn label="Give a property" disabled={shut} onPress={() => onOpen("grant")} icon={<Building2 size={16} color={shut ? c.grey500 : c.ink900} />} /> : null}
            {person.maySetPassword ? <Btn variant="ghost" label={person.canSignIn ? "Password" : "Set a password"} disabled={shut} onPress={() => onOpen("password")} /> : null}
            {person.mayEdit ? <Btn variant="ghost" label="Edit" a11y={`Edit ${person.name}`} disabled={shut} onPress={() => onOpen("edit")} /> : null}
            {person.mayTwoStepOff ? <Btn variant="ghost" label="Two-step off" disabled={shut} onPress={() => onOpen("two-step")} /> : null}
            {person.maySwitch ? <Btn label={act.busy ? "…" : "Deactivate"} a11y={`Deactivate ${person.name}`} disabled={off} onPress={() => void deactivate()} /> : null}
          </View>
        ) : null
      ) : person.maySwitch ? (
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: c.grey100, paddingTop: 12 }}>
          <Btn label={act.busy ? "…" : "Bring them back"} a11y={`Bring ${person.name} back`} disabled={off} onPress={() => void bringBack()} />
        </View>
      ) : null}
      {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("done", "this person's card").line} Reading the list again…</Text> : null}
    </View>
  );
}

/* ── The sheets (the web's dialogs) ──────────────────────────────── */

/** The foot of a sheet: Cancel, and the act - greyed while on its way or stuck. */
function Foot2({ onCancel, label, onPress, ready, busy, stuck, cancel = "Cancel" }: {
  onCancel: () => void; label: string; onPress: () => void; ready: boolean; busy: boolean; stuck: boolean; cancel?: string;
}) {
  return (
    <>
      <Btn label={cancel} onPress={onCancel} disabled={busy} grow />
      <Btn label={busy ? "…" : label} variant="primary" onPress={onPress} disabled={!ready || busy || stuck} grow />
    </>
  );
}
const StuckLine = ({ what, stuck }: { what: string; stuck: boolean }) =>
  stuck ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{notKnown(what, "the list of people").line} Close this to read it again.</Text> : null;

function AddPerson({ stop, places: realPlaces, testPlaces, placeRequired, onClose, onSaid }: {
  stop: Stop; places: RosterPlace[]; testPlaces: RosterPlace[] | null; placeRequired: boolean; onClose: () => void; onSaid: (s: Said) => void;
}) {
  const act = useAct(undefined, stop);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [test, setTest] = useState(false);
  const places = test ? testPlaces ?? [] : realPlaces;
  const needsPlace = placeRequired || test;
  const [code, setCode] = useState(places.length === 1 ? places[0]!.code : "");
  const [picked, setPicked] = useState("");
  const place = places.find((p) => p.code === code);
  const roles = place?.roles ?? [];
  const role = chosenRole(roles, picked);
  const { min, ready } = addReady({ name, email, password, needsPlace, place, role });
  const switchTest = (on: boolean) => {
    const list = on ? testPlaces ?? [] : realPlaces;
    setTest(on); setCode(list.length === 1 ? list[0]!.code : ""); setPicked("");
  };
  const submit = () => act.run(() => createStaff({
    email: email.trim().toLowerCase(), name: name.trim(), password, ...(needsPlace ? { hotelCode: code, role } : {}),
  }), {
    ok: (r) => { const w = addedWords({ name, existed: Boolean(r.existed), test, placeRequired, code, role }); onSaid({ title: w.title, body: w.body, tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not added")),
    unknown: (e) => onSaid({ ...notKnown("added", "the list of people", e), tone: "bad" }),
  });
  return (
    <Sheet open title="Add somebody" onClose={onClose} closable={!act.busy}
      description={placeRequired ? "Set them a password, where they work and what they do, and they can sign in straight away."
        : "Set them a password and they can sign in straight away. What they can SEE comes next."}
      footer={<Foot2 onCancel={onClose} label="Add" onPress={() => void submit()} ready={ready} busy={act.busy} stuck={act.stuck} />}>
      <Field label="Their name" required value={name} onChangeText={setName} placeholder="Sunita Kulkarni" input={keys.name} />
      <Field label="The email they will sign in with" required value={email} onChangeText={setEmail} input={keys.email} placeholder="sunita@fidatohotels.com"
        hint="This is the link between the person and the account. A typo here means they cannot sign in at all." />
      <PasswordField label="A password for them" value={password} onChangeText={setPassword}
        hint={`At least ${min} characters. Tell it to them - nothing is emailed.`}
        error={password.length > 0 && password.length < min ? `At least ${min} characters.` : undefined} />
      {testPlaces ? (
        <SwitchRow label="Test" description="For practising in a test hotel, never a real one." value={test} onChange={switchTest} />
      ) : null}
      {needsPlace ? (
        <>
          <Choose label="Where they work" value={code} onChange={setCode} none={places.length > 1 ? "Choose…" : undefined}
            choices={places.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}${test ? " (TEST)" : ""}` }))}
            hint={test && places.length === 0 ? "There is no test hotel yet. Make one on Properties first." : undefined} />
          <Choose label="Doing what" value={role} onChange={setPicked} disabled={!place}
            choices={roles.map((r) => ({ value: r, label: roleLabel(r) }))} />
        </>
      ) : null}
      <View style={{ borderRadius: 8, backgroundColor: c.grey50, paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text style={[body, { color: c.grey600 }]}>
          {test ? "Works only in the test hotel, never the real one."
            : placeRequired ? `They see this property only.${place && !roles.includes("admin") ? " Only the owner can make somebody an Admin." : ""}`
            : "This adds an ordinary member of staff. Somebody who should reach every property is a group administrator, and making one takes the provisioning key - a deliberate step, because it is the only role that steps outside per-property access."}
        </Text>
      </View>
      <StuckLine what="added" stuck={act.stuck} />
    </Sheet>
  );
}

function Grant({ stop, person, places, testCodes, onClose, onSaid }: {
  stop: Stop; person: AdminStaff; places: RosterPlace[]; testCodes: Set<string>; onClose: () => void; onSaid: (s: Said) => void;
}) {
  const act = useAct(undefined, stop);
  const [code, setCode] = useState("");
  const [picked, setPicked] = useState("front_desk");
  const { testOnly, places: available } = grantable(person, places, testCodes);
  const roles = available.find((p) => p.code === code)?.roles ?? [];
  const role = roles.includes(picked) ? picked : roles[0] ?? "";
  const submit = () => act.run(() => grantAccess(person.id, code, role), {
    ok: () => { onSaid({ title: `${person.name} can now work at ${code}`, body: `As ${roleLabel(role).toLowerCase()}.`, tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not given")),
    unknown: (e) => onSaid({ ...notKnown("given", "the list of people", e), tone: "bad" }),
  });
  return (
    <Sheet open title={`Give ${person.name} a property`} onClose={onClose} closable={!act.busy}
      description="Access is per property. This is what stops one hotel seeing another's guests."
      footer={<Foot2 onCancel={onClose} label="Give access" onPress={() => void submit()} ready={Boolean(code && role)} busy={act.busy} stuck={act.stuck} />}>
      {available.length === 0 ? (
        <Empty title="Nothing left to give" description={places.length > 0 ? `${person.name} already works at every property you can give.` : "There is no property you can give anybody."} />
      ) : (
        <>
          <Choose label="Which property" value={code} onChange={setCode} none="Choose…"
            choices={available.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}${testCodes.has(p.code) ? " (TEST)" : ""}` }))} />
          {testOnly ? <Text style={[body, { color: c.grey600 }]}>{person.name} works only in test hotels, so only test hotels are offered.</Text> : null}
          <Choose label="Doing what" value={role} onChange={setPicked} disabled={!code}
            choices={roles.map((r) => ({ value: r, label: roleLabel(r) }))} />
          {role ? (
            <View style={{ borderRadius: 8, backgroundColor: c.grey50, paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={[body, { color: c.grey600 }]}>{roleWhat(role)}.</Text>
            </View>
          ) : null}
        </>
      )}
      <StuckLine what="given" stuck={act.stuck} />
    </Sheet>
  );
}

function Password({ stop, person, onClose, onSaid }: { stop: Stop; person: AdminStaff; onClose: () => void; onSaid: (s: Said) => void }) {
  const act = useAct(undefined, stop);
  const [value, setValue] = useState("");
  const min = minPasswordFor(person.access.map((a) => a.role), person.isGroupAdmin);
  const submit = () => act.run(() => setStaffPassword(person.id, value), {
    ok: () => { onSaid({ title: `${person.name} can sign in`, body: `Tell them the password and the address ${person.email}.`, tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not set")),
    unknown: (e) => onSaid({ ...notKnown("set", "the list of people", e), tone: "bad" }),
  });
  return (
    <Sheet open onClose={onClose} closable={!act.busy}
      title={person.canSignIn ? `New password for ${person.name}` : `Give ${person.name} a password`}
      description={person.canSignIn ? "Their old one stops working immediately." : "They have no way to sign in until this is set."}
      footer={<Foot2 onCancel={onClose} label="Set it" onPress={() => void submit()} ready={value.length >= min} busy={act.busy} stuck={act.stuck} />}>
      <PasswordField label="Password" value={value} onChangeText={setValue}
        hint={`At least ${min} characters. They type it at a terminal in front of guests, so something they can remember.`}
        error={value.length > 0 && value.length < min ? `At least ${min} characters.` : undefined} />
      <Text style={[body, { color: c.grey600 }]}>They sign in with <Text style={{ color: c.ink900 }}>{person.email}</Text> and this password. Nothing is emailed - tell them yourself.</Text>
      <StuckLine what="set" stuck={act.stuck} />
    </Sheet>
  );
}

function Edit({ stop, person, onClose, onSaid }: { stop: Stop; person: AdminStaff; onClose: () => void; onSaid: (s: Said) => void }) {
  const act = useAct(undefined, stop);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone ?? "");
  const [home, setHome] = useState(person.homeScreen);
  /* The web's two writes in one Save: the name and phone, then where they start (only when it changed). */
  const submit = () => act.run(async () => {
    await amendStaff(person.id, { fullName: name.trim(), phone: phone.trim() });
    if (!person.isGroupAdmin && home !== person.homeScreen) await setHomeScreen(person.id, home);
  }, {
    ok: () => { onSaid({ title: `${name.trim()} saved`, tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not saved")),
    unknown: (e) => onSaid({ ...notKnown("saved", "the list of people", e), tone: "bad" }),
  });
  return (
    <Sheet open title={`Edit ${person.name}`} onClose={onClose} closable={!act.busy}
      description="Their name is on everything they have done. The email is how they sign in and cannot be changed here."
      footer={<Foot2 onCancel={onClose} label="Save" onPress={() => void submit()} ready={Boolean(name.trim())} busy={act.busy} stuck={act.stuck} />}>
      <Field label="Name" required value={name} onChangeText={setName} input={keys.name} />
      <Field label="Phone" value={phone} onChangeText={setPhone} input={keys.phone} />
      {!person.isGroupAdmin ? (
        <Choose label="Starts on" value={home} onChange={setHome} choices={HOME_SCREENS}
          hint="The first screen after they sign in. They can change it themselves." />
      ) : null}
      <Text style={[body, { color: c.grey500 }]}>Signs in as <Text style={{ color: c.ink900 }}>{person.email}</Text>.</Text>
      <StuckLine what="saved" stuck={act.stuck} />
    </Sheet>
  );
}

function TwoStepOff({ stop, person, onClose, onSaid }: { stop: Stop; person: AdminStaff; onClose: () => void; onSaid: (s: Said) => void }) {
  const act = useAct(undefined, stop);
  const [reason, setReason] = useState("");
  const submit = () => act.run(() => switchTwoStepOff(person.id, reason), {
    ok: () => { onSaid({ title: `Two-step sign-in is off for ${person.name}`, body: "They sign in with the password alone, until they set it up again.", tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not switched off")),
    unknown: (e) => onSaid({ ...notKnown("switched off", "the list of people", e), tone: "bad" }),
  });
  return (
    <Sheet open title={`Switch two-step sign-in off for ${person.name}?`} onClose={onClose} closable={!act.busy}
      description="For a lost or changed phone. The reason goes into the audit log."
      footer={<Foot2 onCancel={onClose} cancel="Keep it on" label="Switch it off" onPress={() => void submit()} ready={Boolean(reason.trim())} busy={act.busy} stuck={act.stuck} />}>
      <Field label="Why" required multiline value={reason} onChangeText={setReason} placeholder="Lost phone" />
      <StuckLine what="switched off" stuck={act.stuck} />
    </Sheet>
  );
}
