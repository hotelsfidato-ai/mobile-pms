import { useQueryClient } from "@tanstack/react-query";
import { BedDouble, Check, Plus, UtensilsCrossed, Wrench } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { actOnRequest, listRequests, raiseRequest } from "./data";
import {
  Back, Box, Btn, body, Dialog, Empty, Failed, Field, Foot, IconChip, InDialog, Input, Loading, NotYours, Pill,
  Segmented, Select, Stale, Toast, roomChoices, saidOf, usePoll, type Said,
} from "./kit";
import { TEAMS, whyNotRequests, type Team } from "./roles";
import { TEAM_LABEL, closeAsks, isClosed, requestLine, type GuestRequest, type InHouse } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   GUEST REQUESTS on a phone — the web's /h/:code/requests
   (src/modules/guest-services/pages/Requests.tsx; picture
   pms-shots/new/n-h-requests). The desk sees every team's, a team its own:
   the server sends only those, so what is on screen can be acted on.
   Take it, then Done, or Done straight away; closing something broken
   asks what was done, Cancel always asks why. Read again every 30 seconds.
   Refused offline with the web's sentence: nothing here is held.
   ══════════════════════════════════════════════════════════════════ */

type View_ = "open" | "done";
const TEAM_ICON = { housekeeping: BedDouble, maintenance: Wrench, fnb: UtensilsCrossed };

export function Requests({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotRequests(role);
  const [view, setView] = useState<View_>("open");
  const [team, setTeam] = useState<Team | "all">("all");
  const [raising, setRaising] = useState(false);
  const [closing, setClosing] = useState<{ r: GuestRequest; action: "done" | "cancel" } | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);

  const list = useRead(() => (refused ? Promise.resolve(null) : listRequests(code, view)), ["guest-services", code, "requests", view]);
  usePoll(["guest-services", code, "requests"]);
  const refresh = () => void cache.invalidateQueries({ queryKey: ["guest-services", code, "requests"] });

  async function act(r: GuestRequest, action: "take" | "done") {
    setBusy(r.id);
    try {
      await actOnRequest(code, r.id, action);
      refresh();
    } catch (e) {
      setSaid(saidOf("Not changed", e));
    } finally {
      setBusy(null);
    }
  }

  const teams = list.data?.teams ?? [];
  const shown = (list.data?.requests ?? []).filter((r) => team === "all" || r.team === team);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head title="Guest requests" under="What guests in house have asked for, and who is doing it." action={<Back onPress={onBack} />} />
        <View style={{ flexDirection: "row", marginTop: -4, marginBottom: 8 }}>
          <Btn label="New request" variant="primary" icon={Plus} disabled={refused != null} onPress={() => setRaising(true)} />
        </View>

        <View style={{ gap: 12, marginBottom: 8 }}>
          <Segmented<View_>
            label="Open or done" value={view} onChange={setView}
            options={[{ value: "open", label: "Open" }, { value: "done", label: "Done, last 24 h" }]}
          />
          {teams.length > 1 ? (
            <Segmented<Team | "all">
              label="Which team" value={team} onChange={setTeam}
              options={[{ value: "all", label: "All" }, ...teams.map((x) => ({ value: x, label: TEAM_LABEL[x] }))]}
            />
          ) : null}
        </View>

        {refused ? <NotYours title="Guest requests" sentence={refused} />
          : list.data === undefined
            ? (list.error ? <Failed title="Guest requests did not load" error={list.error} onRetry={list.reload} /> : <Loading words="Reading guest requests…" />)
            : shown.length === 0 ? (
              <Empty
                title={view === "open" ? "Nothing waiting" : "Nothing done in the last 24 hours"}
                description={view === "open"
                  ? "A request shows here when a guest asks on their own page, or when somebody raises one with New request."
                  : "A request shows here once it is done or cancelled, with who did it and how long it took."}
              />
            ) : (
              <>
                <Stale error={list.error} />
                {shown.map((r) => (
                  <RequestCard
                    key={r.id} r={r} busy={busy != null}
                    onTake={() => void act(r, "take")}
                    onDone={() => (closeAsks(r.team, "done") ? setClosing({ r, action: "done" }) : void act(r, "done"))}
                    onCancel={() => setClosing({ r, action: "cancel" })}
                  />
                ))}
              </>
            )}
      </Screen>

      <Toast said={said} onClose={() => setSaid(null)} />
      {raising ? (
        <RaiseDialog
          code={code} rooms={list.data?.rooms ?? []} onClose={() => { setRaising(false); refresh(); }}
          onDone={(line) => { setSaid({ title: "Raised", body: line, tone: "ok" }); refresh(); }}
        />
      ) : null}
      {closing ? <CloseDialog code={code} {...closing} onClose={() => setClosing(null)} onDone={refresh} /> : null}
    </View>
  );
}

function RequestCard({ r, busy, onTake, onDone, onCancel }: {
  r: GuestRequest; busy: boolean; onTake: () => void; onDone: () => void; onCancel: () => void;
}) {
  const closed = isClosed(r);
  return (
    <Box style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <IconChip Icon={TEAM_ICON[r.team]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Text style={[body, { color: c.ink900 }]}>{r.what}</Text>
            <Pill>{TEAM_LABEL[r.team]}</Pill>
            {r.status === "in_progress" ? <Pill tone="info">Being done</Pill> : null}
            {r.status === "done" ? <Pill tone="success">Done</Pill> : null}
            {r.status === "cancelled" ? <Pill>Cancelled</Pill> : null}
          </View>
          {r.when ? <Text style={[body, { marginTop: 2 }]}>When: {r.when}</Text> : null}
          <Text style={[body, { color: c.grey500, marginTop: 4 }]}>{requestLine(r)}</Text>
          {closed && r.resolution && r.resolution !== "Done" ? <Text style={[body, { marginTop: 2 }]}>{r.resolution}</Text> : null}
        </View>
      </View>
      {!closed ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 42 }}>
          {r.status === "open" ? <Btn label="Take it" a11y={`Take it: ${r.what}`} onPress={onTake} disabled={busy} /> : null}
          <Btn label="Done" a11y={`Done: ${r.what}`} icon={Check} onPress={onDone} disabled={busy} />
          <Btn label="Cancel it" a11y={`Cancel it: ${r.what}`} variant="ghost" onPress={onCancel} disabled={busy} />
        </View>
      ) : null}
    </Box>
  );
}

function RaiseDialog({ code, rooms, onClose, onDone }: {
  code: string; rooms: InHouse[]; onClose: () => void; onDone: (line: string) => void;
}) {
  const [reservationId, setReservationId] = useState(rooms[0]?.reservationId ?? "");
  const [team, setTeam] = useState<Team>("housekeeping");
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  /* A second tap is a second request, and the route reads no key: latched at
     the tap, and after an unknown outcome no more taps until this is closed
     and the open requests read again (MGS-3). */
  const latch = useRef(false);
  const once = useStuck();

  async function save() {
    if (latch.current || once.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await raiseRequest(code, { reservationId, team, what, when });
      onClose();
      onDone(`${TEAM_LABEL[team]}: ${what.trim()}`);
    } catch (e) {
      setSaid(once.stop(e) ? { ...notKnown("raised", "the open requests once this is closed", e), tone: "bad" } : saidOf("Not raised", e));
      setBusy(false);
    } finally {
      latch.current = false;
    }
  }

  return (
    <Dialog title="New request" description="For a guest in house now." onClose={onClose}>
      {rooms.length === 0 ? (
        <Text style={body}>Nobody is checked in, so there is nobody to raise a request for.</Text>
      ) : (
        <>
          <Field label="Room" required>
            <Select label="Room" value={reservationId} options={roomChoices(rooms)} onChange={setReservationId} />
          </Field>
          <Segmented<Team>
            stacked label="Which team" value={team} onChange={setTeam}
            options={TEAMS.map((x) => ({ value: x, label: TEAM_LABEL[x] }))}
          />
          <Field label="What is wanted" required>
            <Input label="What is wanted" rows={3} maxLength={500} value={what} onChangeText={setWhat} autoFocus />
          </Field>
          <Field label="When" hint="Only if the guest said.">
            <Input label="When" maxLength={100} value={when} onChangeText={setWhen} />
          </Field>
          <InDialog said={said} />
          <Foot>
            <Btn label="Cancel" tall grow onPress={onClose} />
            <Btn label="Raise it" variant="primary" tall grow disabled={busy || once.stuck || !reservationId || !what.trim()} onPress={() => void save()} />
          </Foot>
        </>
      )}
    </Dialog>
  );
}

/** Done on something broken (what was done), or Cancel on any (why). */
function CloseDialog({ code, r, action, onClose, onDone }: {
  code: string; r: GuestRequest; action: "done" | "cancel"; onClose: () => void; onDone: () => void;
}) {
  const ask = closeAsks(r.team, action)!;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function finish() {
    setBusy(true);
    setSaid(null);
    try {
      await actOnRequest(code, r.id, action, note.trim());
      onClose();
      onDone();
    } catch (e) {
      setSaid(saidOf("Not changed", e));
      setBusy(false);
    }
  }

  return (
    <Dialog title={r.what} {...(r.room ? { description: `Room ${r.room}` } : {})} onClose={onClose}>
      <Field label={ask.label} required {...(ask.hint ? { hint: ask.hint } : {})}>
        <Input label={ask.label} rows={3} value={note} onChangeText={setNote} autoFocus />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Back" tall grow onPress={onClose} />
        <Btn label={ask.button} variant={ask.danger ? "danger" : "primary"} tall grow disabled={busy || !note.trim()} onPress={() => void finish()} />
      </Foot>
    </Dialog>
  );
}
