import { useState } from "react";
import { Text, View } from "react-native";
import { t } from "../../core/theme";
import { s as core } from "../../core/ui";
import { Toast, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { PageFrame, Read, StuckLine, Tabs, TextEditor, mayEditHere, readOnlyLine, refusedPage, usePage, useWrites } from "./PropertyKit";
import { readTexts } from "./propertyData";
import { HIGHLIGHTS, type TextKind } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   HIGHLIGHTS on a phone — Settings → Property → Highlights (the web's
   pages/property/Highlights.tsx, D27-257): five texts guests read on their
   page, behind the code, one tab each. Plain text; a blank line starts a
   new paragraph; saved blank, a text is removed. GET /:code/property-
   profile; PUT /:code/texts/:kind (`room_config` edit). Not pictured.
   ══════════════════════════════════════════════════════════════════ */

export function PropHighlights({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/highlights", "Highlights");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "highlights", () => (refused ? Promise.resolve(null) : readTexts(code, "highlights")));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const [kind, setKind] = useState<TextKind>("about");
  const mayEdit = mayEditHere(role);
  const label = HIGHLIGHTS.find(([k]) => k === kind)![1];
  return (
    <View style={{ flex: 1 }}>
      <PageFrame title="Highlights"
        under="What guests read about the hotel on their page, after the code. Leave one blank and it is not shown."
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the highlights">
          {(p) => p ? (
            <>
              <StuckLine stuck={w.stuck} />
              <Tabs label="Highlights" value={kind} onChange={setKind} options={HIGHLIGHTS} />
              <View style={[core.card, { gap: 12 }]}>
                {/* Keyed by the kind: a tab change starts from what is saved, as the web's tab does. */}
                <TextEditor key={kind} code={code} page="highlights" kind={kind} label={label} value={p.texts[kind] ?? ""}
                  hint="Plain words; a blank line starts a new paragraph." mayEdit={mayEdit} w={w} />
              </View>
              {!mayEdit ? <Text style={t.caption}>{readOnlyLine("Changing the property's profile")}</Text> : null}
            </>
          ) : null}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}
