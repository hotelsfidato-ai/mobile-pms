import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { Head, Screen, s as core, notKnown, useRead } from "../../core/ui";
import { getModules, setModule } from "./data";
import { Failed, Loading, Refused, Stale, SwitchRow, Toast, body, saidOf, useAct, useSaid, type Said } from "./kit";
import { refusedScreen } from "./roles";
import { MODULE_COPY, bookingSection, moduleLabel, switchedWords } from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   MODULES on a phone — Settings → Modules and connections → Modules
   (console.settings.ts ModulesSettings; pages/Admin.tsx ModulesCard).
   What this property runs, and New booking's fold-open sections: one
   switch each, each phone's own Switch. The owner's and an Admin's only
   (D17-36): the page is not offered to anybody else, and the server asks
   again (MODULE_SWITCH_REFUSED). Turning one off hides its screens AND the
   API refuses them, so after each switch the frame's menu reads the
   property's modules again (["modules", code], Shell.tsx). Refused
   offline with the web's sentence. Not pictured (no picture of it).
   ══════════════════════════════════════════════════════════════════ */

export function Modules({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedScreen(role, "modules");
  const { said, say, close } = useSaid();
  const [pulled, setPulled] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const key = ["admin", code, "modules"];
  const read = useRead(async () => {
    if (refused) return null;
    const started = Date.now();
    const answer = await getModules(code);
    setSeenAt(started);
    return answer;
  }, key);
  const done = (s: Said) => {
    say(s);
    void cache.invalidateQueries({ queryKey: key });
    void cache.invalidateQueries({ queryKey: ["modules", code] });
  };
  const all = read.data ?? [];
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
        <Head title="Modules" under={hotel.name} />
        {refused ? <Refused sentence={refused} /> : read.data === undefined
          ? (read.error ? <Failed error={read.error} onRetry={read.reload} /> : <Loading what="the modules" />)
          : read.data === null ? null : (
            <>
              <Stale error={read.error} />
              <Card title="Modules" line="What this property runs." info="Off means the screens go and the API refuses them."
                rows={all.filter((m) => !bookingSection(m.module))} seenAt={seenAt} code={code} onSaid={say} onDone={done} />
              <Card title="New booking" line="The sections that fold open on New booking." info="Off hides one at this property; nothing already booked changes."
                rows={all.filter((m) => bookingSection(m.module))} seenAt={seenAt} code={code} onSaid={say} onDone={done} />
            </>
          )}
      </Screen>
      <Toast said={said} onClose={close} />
    </View>
  );
}

function Card({ title, line, info, rows, seenAt, code, onSaid, onDone }: {
  title: string; line: string; info: string; rows: { module: string; enabled: boolean }[]; seenAt: number; code: string;
  onSaid: (s: Said) => void; onDone: (s: Said) => void;
}) {
  return (
    <View style={[core.card, { paddingVertical: 0 }]}>
      <View style={{ paddingVertical: 14, gap: 2, borderBottomWidth: 1, borderColor: c.grey100 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        <Text style={[body, { color: c.grey500 }]}>{line}</Text>
        {/* The web's (i): said here, a phone has no hover. */}
        <Text style={[t.caption, { lineHeight: 17 }]}>{info}</Text>
      </View>
      {rows.map((m, i) => <One key={m.module} m={m} first={i === 0} seenAt={seenAt} code={code} onSaid={onSaid} onDone={onDone} />)}
    </View>
  );
}

function One({ m, first, seenAt, code, onSaid, onDone }: {
  m: { module: string; enabled: boolean }; first: boolean; seenAt: number; code: string; onSaid: (s: Said) => void; onDone: (s: Said) => void;
}) {
  const act = useAct(seenAt);
  const flip = (next: boolean) => act.run(() => setModule(code, m.module, next), {
    ok: () => { const w = switchedWords(m.module, next); onDone({ title: w.title, body: w.body, tone: "ok" }); },
    no: (e) => onSaid(saidOf(e, "Not changed")),
    unknown: (e) => onDone({ ...notKnown(`turned ${next ? "on" : "off"}`, `${moduleLabel(m.module)} here`, e), tone: "bad" }),
  });
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderColor: c.grey100, gap: 4 }}>
      <SwitchRow label={moduleLabel(m.module)} description={MODULE_COPY[m.module]?.note} value={m.enabled}
        disabled={act.busy || act.stuck} onChange={(v) => void flip(v)} />
      {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("changed", "this switch").line}</Text> : null}
    </View>
  );
}
