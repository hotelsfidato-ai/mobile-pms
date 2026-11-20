import { useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { Contact, s as core, confirmAct, keys } from "../../core/ui";
import { Btn, Field, Sheet, Toast, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { CardHead, PageFrame, Read, StuckLine, Value, mayEditHere, readOnlyLine, refusedPage, usePage, useWrites, type Writes } from "./PropertyKit";
import { LogoRow } from "./PropPhotos";
import { readGroup, removeGroupLogo, setGroupName, setGroupOffice } from "./propertyData";
import { OFFICE, OFFICE_SHOWN, groupNameSaid, type GroupOffice } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   GROUP on a phone — Settings → Property → Group (the web's console.
   settings.ts stand-in GroupSettings: components/GroupCard.tsx, the owner's
   D27-53, D27-65, D27-215): one setting for every hotel, printed on every
   bill as "by <group name>" under the property's name, with the logo; and
   the group's office details, the footer of every booking voucher.

   Changed by the owner, an administrator or the GM (`room_config` edit:
   PUT /:code/group/name, DELETE /:code/group/logo, PUT /:code/group/
   office). The logo's Upload / Replace is a file the phone cannot choose
   yet (expo-document-picker ~57.0.3): greyed "On the website for now".
   Remove asks first (the web removes at one tap). GET /:code/group. Not
   pictured. The phone and email open the dialler and mail.
   ══════════════════════════════════════════════════════════════════ */

export function PropGroup({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/group", "Group");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "group", () => (refused ? Promise.resolve(null) : readGroup(code, "group")));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const mayEdit = mayEditHere(role);
  return (
    <View style={{ flex: 1 }}>
      <PageFrame title="Group" under={hotel.name}
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the group's settings">
          {(g) => {
            if (!g) return null;
            const saveName = () => void w.write(() => setGroupName(code, typed ?? ""), {
              ok: (r) => ({ title: "Group name saved", body: groupNameSaid(r.name), tone: "ok" }), done: "saved", where: "the group's name",
              after: () => setTyped(null),
            });
            const removeLogo = () => confirmAct("Remove the group's logo?", "A hotel with a logo of its own still prints it.", "Remove", () =>
              void w.write(() => removeGroupLogo(code), {
                ok: () => ({ title: "Logo removed", body: "A hotel with a logo of its own still prints it.", tone: "ok" }),
                done: "removed", where: "the group's logo", no: "Not removed",
              }));
            return (
              <>
                <StuckLine w={w} />
                <View style={[core.card, { gap: 16 }]}>
                  <CardHead title="Group name and logo" line={"One for every hotel, printed on every bill: the hotel's name, then \"by\" the group's."} />
                  {typed === null ? (
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
                      <Value label="Group name" value={g.name} />
                      {mayEdit ? <Btn label="Change" disabled={w.off} onPress={() => setTyped(g.name ?? "")} /> : null}
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <Field label="Group name" hint={'As it prints after "by". Blank for none.'} maxLength={80} input={keys.name} value={typed} onChangeText={setTyped} />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Btn variant="primary" label={w.busy ? "…" : "Save"} disabled={w.off} onPress={saveName} />
                        <Btn variant="ghost" label="Cancel" disabled={w.busy} onPress={() => setTyped(null)} />
                      </View>
                    </View>
                  )}
                  <LogoRow logo={g.logo} alt="The group's logo" mayEdit={mayEdit} off={w.off} onRemove={removeLogo} />
                  <Office code={code} office={g.office} mayEdit={mayEdit} w={w} />
                </View>
                {!mayEdit ? <Text style={t.caption}>{readOnlyLine("Changing the group's name")}</Text> : null}
              </>
            );
          }}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}

/* The group's office details (GroupCard.tsx OfficeDetails). */
function Office({ code, office, mayEdit, w }: { code: string; office: GroupOffice | undefined; mayEdit: boolean; w: Writes }) {
  const [form, setForm] = useState<Record<keyof GroupOffice, string> | null>(null);
  const open = () => setForm(Object.fromEntries(OFFICE.map(([key]) => [key, office?.[key] ?? ""])) as Record<keyof GroupOffice, string>);
  const save = () => void w.write(() => setGroupOffice(code, form!), {
    ok: () => ({ title: "Office details saved", body: "They print in the footer of every booking voucher from now on.", tone: "ok" }),
    done: "saved", where: "the office details", after: () => setForm(null),
  });
  const labelOf = (key: keyof GroupOffice) => OFFICE.find(([k]) => k === key)![1];
  const input = (key: keyof GroupOffice) =>
    key === "phone" ? keys.phone : key === "email" ? keys.email : key === "gstin" ? keys.code
      : key === "website" || key === "instagram" ? { autoCapitalize: "none" as const, autoCorrect: false } : undefined;
  return (
    <View style={{ gap: 12, borderTopWidth: 1, borderColor: c.grey100, paddingTop: 14 }}>
      <View style={{ gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>Office details</Text>
        <Text style={t.caption}>The footer of every booking voucher. Until one is typed, a voucher's footer is the hotel's own.</Text>
      </View>
      {mayEdit ? <View style={{ alignSelf: "flex-start" }}><Btn label="Change office details" disabled={w.off} onPress={open} /></View> : null}
      {OFFICE_SHOWN.map((key) => {
        const v = office?.[key] ?? null;
        return key === "phone" && v ? <Value key={key} label={labelOf(key)}><Contact kind="tel" value={v} style={[t.label, { fontSize: 16 }]} /></Value>
          : key === "email" && v ? <Value key={key} label={labelOf(key)}><Contact kind="mailto" value={v} style={[t.label, { fontSize: 16 }]} /></Value>
          : <Value key={key} label={labelOf(key)} value={v} />;
      })}
      {form ? (
        <Sheet open title="The group's office details" description="Printed in the footer of every hotel's booking voucher. Leave one blank and it is left out."
          onClose={() => setForm(null)} closable={!w.busy}
          footer={<>
            <Btn label="Cancel" onPress={() => setForm(null)} disabled={w.busy} grow />
            <Btn variant="primary" label={w.busy ? "…" : "Save"} disabled={w.off} onPress={save} grow />
          </>}>
          {OFFICE.map(([key, label, hint]) => (
            <Field key={key} label={label} hint={hint} input={input(key)} value={form[key]}
              onChangeText={(v) => setForm({ ...form, [key]: key === "gstin" ? v.toUpperCase() : v })} />
          ))}
          <StuckLine w={w} />
        </Sheet>
      ) : null}
    </View>
  );
}
