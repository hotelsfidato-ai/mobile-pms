import { Check, Minus, ShieldCheck, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { ROLE_LABELS, type Role } from "../../core/menu";
import { c, t } from "../../core/theme";
import { Head, Screen, s as core } from "../../core/ui";
import { Choose, Foot, Pill, Refused, body } from "./kit";
import { MATRIX_ROLES, RESOURCES, RESOURCE_LABELS, RESTAURANT_BY_NAME, cellOf, inWords, refusedScreen } from "./roles";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   ROLES AND PERMISSIONS on a phone — the web's /admin/roles, now
   Settings → People and security → Roles and permissions (pages/Admin.tsx
   RolesPage). Read only. The web draws the live matrix from its own
   permissions.ts, which the server holds equal (api/src/permissions.ts);
   the phone draws the same matrix from the core's port of it (menu.ts),
   so it cannot say other than what the menus and the server do.

   At 390 px the web's table (26 resources × 15 roles) scrolls sideways;
   here one role's column is shown at a time, chosen above it, each
   resource on its row in the matrix's order: a tick for every action,
   a dash for none, else the actions by name (QA AD-8). MODULE.md, 4.
   ══════════════════════════════════════════════════════════════════ */

export function Roles({ role }: AdminProps) {
  const refused = refusedScreen(role, "roles");
  const [shown, setShown] = useState<Role>(role);
  return (
    <Screen refreshing={false} onRefresh={() => undefined}>
      <Head title="Roles and permissions"
        under="The live matrix. The menus, every disabled button and the server read this same source, so it cannot drift from what the product enforces." />
      {refused ? <Refused sentence={refused} /> : (
        <>
          <View style={{ flexDirection: "row", marginTop: -8 }}><Pill tone="info">{`${MATRIX_ROLES.length} roles`}</Pill></View>
          <Choose label="Role" value={shown} onChange={(v) => setShown(v as Role)}
            choices={MATRIX_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
          <View style={[core.card, { paddingVertical: 4 }]}>
            <View style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderColor: c.grey200 }}>
              <Text style={[t.eyebrow, { flex: 1 }]}>Resource</Text>
              <Text style={t.eyebrow}>{ROLE_LABELS[shown]}</Text>
            </View>
            {RESOURCES.map((resource, i) => {
              const cell = cellOf(shown, resource);
              return (
                <View key={resource} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: c.grey100 }}>
                  <Text style={[body, { flex: 1, color: c.ink900 }]}>{RESOURCE_LABELS[resource]}</Text>
                  {cell.kind === "none" ? <Minus size={14} color={c.grey300} accessibilityLabel="Nothing" />
                    : cell.kind === "all" ? <Check size={16} color={c.success} accessibilityLabel="Everything" />
                    : <Text style={[t.caption, { color: c.grey600, flexShrink: 1, textAlign: "right" }]}>{cell.words}</Text>}
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <ShieldCheck size={14} color={c.grey500} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}><Foot>A tick is every action; otherwise the actions granted are named. A blocked action is never hidden in the product: it is shown disabled, with the reason this matrix produces.</Foot></View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <UtensilsCrossed size={14} color={c.grey500} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Foot>{`The restaurant is not in the matrix: the server lets the Waiter and the Bar in by name, for ${inWords(RESTAURANT_BY_NAME.does)}, and for reading ${inWords(RESTAURANT_BY_NAME.reads)}. Ringing up an order includes sending the KOT, printing the bill and taking payment; a discount is the GM's, the owner's and an administrator's (D27-352). The Bar orders only the dishes on the menu's Bar tab.`}</Foot>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
