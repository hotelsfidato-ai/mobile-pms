import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Building2, Plus } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, t } from "../../core/theme";
import { Screen, useRead } from "../../core/ui";
import { PageHead, Pill } from "../front-desk/kit";
import { Btn, Failed, NotYours, Stale, Toast, type Said } from "../guest-services/kit";
import { Blank, Exports, Line, Panel, RowCard } from "../leads/kit";
import { isRefused, readCompanyRecords } from "./data";
import { CompanyDialog } from "./Dialogs";
import { whyNotAddCompany, whyNotChangeCompany, whyNotContracts } from "./roles";
import { contractHere, contractsTable, creditLine, EMPTY, KIND_LABEL, TITLE, UNDER } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   CONTRACTS on a phone — the web's /contracts
   (src/modules/contracts/pages/Contracts.tsx; picture
   pms-shots/new/n-contracts, dev-owner). mobile/m13-sales.

   The group's companies and agents, each with its contract in force at
   this hotel today; a card opens the company. Whoever reads companies
   reads this (C-6); the owner, an administrator, the GM and reception add
   a company (C-7, reception without credit) - anyone else sees Add
   company greyed with the API's sentence (the web hides it). Credit and
   its limit are the server's figures, a dash where not set.
   ══════════════════════════════════════════════════════════════════ */

export function Contracts({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotContracts(role);
  const mayAdd = whyNotAddCompany(role);
  const keeper = whyNotChangeCompany(role) === null;
  const key = ["contracts", code] as const;
  const cache = useQueryClient();
  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readCompanyRecords(code)), [...key, "list"]);
  const [adding, setAdding] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const refused = isRefused(q.data) ? q.data.refused : null;
  const rows = Array.isArray(q.data) ? q.data : null;

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <PageHead title={TITLE} description={UNDER} />
        <NotYours title={TITLE} sentence={refusedRead ?? refused!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <PageHead title={TITLE} description={UNDER}>
          <Exports role={role} holds="money" table={rows ? contractsTable(rows) : null} />
          {mayAdd === null ? (
            <Btn label="Add company" variant="primary" icon={Plus} onPress={() => setAdding(true)} style={{ alignSelf: "flex-start" }} />
          ) : (
            <View style={{ gap: 4 }}>
              <Btn label="Add company" a11y={`Add company. ${mayAdd}`} variant="primary" icon={Plus} disabled onPress={() => undefined} style={{ alignSelf: "flex-start" }} />
              <Text style={[t.caption, { color: c.grey600 }]}>{mayAdd}</Text>
            </View>
          )}
        </PageHead>
        {rows === null ? (
          q.error ? <Failed title="Could not read the companies" error={q.error} onRetry={q.reload} />
            : <Panel><ActivityIndicator color={c.orange} accessibilityLabel="Reading the companies" /></Panel>
        ) : (
          <>
            <Stale error={q.error} />
            <Panel flush>
              {rows.length === 0 ? <Blank compact icon={Building2} title={EMPTY.title} line={EMPTY.line} /> : rows.map((r, i) => (
                <RowCard
                  key={r.id} first={i === 0} a11y={`Open ${r.name}`}
                  onPress={() => router.push(`/contracts/${code}/${r.id}`)}
                  heading={(
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <Text style={[t.label, { color: c.ink900, lineHeight: 21 }]}>{r.name}</Text>
                      {r.kind === "travel_agent" ? <Pill tone="neutral">{KIND_LABEL[r.kind]}</Pill> : null}
                    </View>
                  )}
                >
                  <Line label="GSTIN">{r.gstin ?? "-"}</Line>
                  <Line label="City">{r.city ?? "-"}</Line>
                  <Line label="Credit">{creditLine(r)}</Line>
                  <Line label="Contract here">{contractHere(r)}</Line>
                </RowCard>
              ))}
            </Panel>
          </>
        )}
      </Screen>
      {adding ? (
        <CompanyDialog
          code={code} keeper={keeper}
          onClose={() => { setAdding(false); void cache.invalidateQueries({ queryKey: key }); }}
          onDone={(s, id) => {
            setAdding(false);
            setSaid(s);
            void cache.invalidateQueries({ queryKey: key });
            if (id) router.push(`/contracts/${code}/${id}`);
          }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}
