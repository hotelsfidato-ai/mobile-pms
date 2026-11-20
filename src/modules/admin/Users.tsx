import { Info } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import { initials } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { Head, Screen, s as core, useRead } from "../../core/ui";
import { listStaff } from "./data";
import { Empty, Failed, Foot, Labelled, Loading, Pill, Refused, Stale, body, type Tone } from "./kit";
import { ROLE_DESCRIPTIONS, refusedScreen } from "./roles";
import { STAFF_STATUS, dateTime } from "./rules";
import type { AdminProps } from "./Route";
import type { Role } from "../../core/menu";

/* ══════════════════════════════════════════════════════════════════
   USERS on a phone — the web's /admin/users (pages/Admin.tsx UsersPage;
   picture pms-shots/all/66-system-administration, as dev-gm). A list,
   on purpose: People does the adding and the access (the web's own
   comment). At phone width the web's table is a card per person with
   ROLE, PROPERTIES, STATUS and LAST SEEN under the name, as here.
   Read: GET /api/hotels/:code/staff (see("user")); row security decides
   who comes back. The role's sentence (the web's tooltip) is under it.
   ══════════════════════════════════════════════════════════════════ */

const TONE: Record<string, Tone> = { active: "success", invited: "warning", inactive: "neutral" };

export function Users({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedScreen(role, "users");
  const [pulled, setPulled] = useState(false);
  const list = useRead(() => (refused ? Promise.resolve(null) : listStaff(code)), ["admin", code, "users"]);
  const rows = list.data ?? [];

  const table = list.data ? {
    title: "Users", subtitle: hotel.name,
    columns: ["Name", "Email", "Role", "Properties", "Status", "Last seen"],
    rows: rows.map((u) => [u.name, u.email, u.roleLabel, u.properties.join(", "), STAFF_STATUS[u.status] ?? u.status, u.lastSeen ? dateTime(u.lastSeen) : "-"]),
  } : null;

  return (
    <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
      <Head title="Users" under="Who can reach what. Access follows the role, and the role follows the permission matrix." />
      {refused ? <Refused sentence={refused} />
        : list.data === undefined ? (list.error ? <Failed error={list.error} onRetry={list.reload} /> : <Loading what="the users" />)
        : list.data === null ? null : (
          <>
            <ExportButtons table={table} />
            <Stale error={list.error} />
            {rows.length === 0 ? (
              <Empty title="Nobody here yet" description="People are added from People, with Add somebody. Their access follows their role." />
            ) : rows.map((u) => (
              <View key={u.id} style={[core.card, { gap: 12 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 12, color: c.grey700, ...face[600] }}>{initials(u.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.label, { color: c.ink900 }]}>{u.name}</Text>
                    <Text style={t.caption}>{u.email}</Text>
                  </View>
                </View>
                <Labelled label="Role">
                  <Text style={[body, { color: c.grey700 }]}>{u.roleLabel}</Text>
                  <Text style={[t.caption, { lineHeight: 17 }]}>{ROLE_DESCRIPTIONS[u.role as Role]}</Text>
                </Labelled>
                <Labelled label="Properties" value={u.properties.join(", ") || "-"} />
                <Labelled label="Status"><Pill tone={TONE[u.status] ?? "neutral"}>{STAFF_STATUS[u.status] ?? u.status}</Pill></Labelled>
                <Labelled label="Last seen" value={u.lastSeen ? dateTime(u.lastSeen) : "-"} />
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Info size={14} color={c.grey500} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Foot>These are real accounts, read from the database. What you can see of them follows your role: a group administrator sees everybody, and anyone else sees themselves and the people rostered at their own properties. Password sign-in still needs a Firebase service account; the accounts and their property grants do not.</Foot>
              </View>
            </View>
          </>
        )}
    </Screen>
  );
}
