import { Handshake, Home, Plus, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Screen, useRead } from "../../core/ui";
import { PageHead, Pill } from "../front-desk/kit";
import { body, Box, Btn, Empty, Loading, NotYours, Stale } from "../guest-services/kit";
import { rupees } from "../laundry/docket";
import { LoadFailed } from "../laundry/kit";
import { isRefused, readCompanies, readCompanyNames } from "./data";
import { Line, OwedText, Tile } from "./kit";
import {
  commissionWords, companyRows, groupLine, groupsOf, KIND_COPY, owed, revenueWords, splitOf, type CompanyRecord,
} from "./lookup";
import { ON_THE_WEBSITE, whyNotAddCompany, whyNotChangeCompany, whyNotCompanies } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   COMPANIES AND AGENTS on a phone — the web's /companies
   (src/modules/guests/pages/Guests.tsx CompaniesPage; picture
   pms-shots/all/16-guests-crm-companies-and-agents). Where the business came
   from and what each channel is worth: the split in three tiles, then each
   kind - travel agents, direct, corporate accounts - with its sources, their
   bookings, room nights, revenue, commission and what each owes, as the
   server sent them. Companies on record with no booking here are listed
   under Corporate accounts, at nothing.

   Read only on the phone. Add company and Edit open the contracts module's
   company form on the web (its GSTIN, address, contact and credit terms):
   drawn where the web draws them, grey, "On the website for now".
   ══════════════════════════════════════════════════════════════════ */

type Row = CompanyRecord & { hasRecord: boolean };

export function Companies({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refused = whyNotCompanies(role);
  const mayAdd = whyNotAddCompany(role);
  const mayEdit = whyNotChangeCompany(role) === null;
  const [pulled, setPulled] = useState(false);
  const list = useRead(() => (refused ? Promise.resolve(null) : readCompanies(code)), ["guests", code, "companies"]);
  const records = useRead(() => (refused ? Promise.resolve([]) : readCompanyNames(code)), ["guests", code, "company-names"]);
  const off = isRefused(list.data) ? list.data.refused : null;
  const booked = list.data && !isRefused(list.data) ? list.data : null;
  /* The records not read (or refused): the bookings' rows alone, as the web. */
  const rows: Row[] = booked ? companyRows(booked, records.data) : [];
  const groups = groupsOf(rows);
  const split = booked && !list.error ? splitOf(rows) : null;
  const reload = () => { list.reload(); records.reload(); };

  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={list.reload}>
        <PageHead title="Companies and agents" />
        <NotYours title="Companies and agents" sentence={refused ?? off!} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); reload(); }}>
      <PageHead title="Companies and agents" description="Where the business came from, and what each channel is worth.">
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row" }}>
            <Btn label="Add company" variant="primary" icon={Plus} disabled onPress={() => undefined} />
          </View>
          <Text style={[t.caption, { color: c.grey600 }]}>
            {mayAdd ?? `Adding or changing a company: ${ON_THE_WEBSITE}`}
          </Text>
        </View>
      </PageHead>

      {/* THE SPLIT, before the detail (the web's order): shares of the revenue that has a source. */}
      {split ? (
        <View style={{ gap: space.card, marginBottom: space.section - space.card }}>
          <Tile icon={Handshake} tone="orange" label="Through an agent" value={rupees(split.agent)} note={`${split.agentPct}% of the revenue`} />
          <Tile icon={Home} tone="blue" label="Direct" value={rupees(split.direct)} note={`${split.directPct}% of the revenue`} />
          <Tile icon={Wallet} tone="neutral" label="Owed to the property" value={rupees(split.owedToUs)} note="Across every source that owes anything" />
        </View>
      ) : null}

      {booked === null ? (list.error
        ? (
          <LoadFailed
            title="The companies did not load" error={list.error} onRetry={reload}
            offline="This device is offline, so the companies and agents cannot load. They load by themselves as soon as the connection is back."
          />
        )
        : <Loading words="Reading the companies and agents…" />)
        : groups.length === 0 ? (
          <Box>
            <Empty compact title="No bookings yet" description="Each company, agent and booking site shows here once a booking comes through it." />
          </Box>
        ) : (
          <>
            <Stale error={list.error} />
            {groups.map((g) => (
              <View key={g.kind} style={{ gap: 12, marginBottom: 12 }}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Text style={t.heading} accessibilityRole="header">{KIND_COPY[g.kind].title}</Text>
                    <Pill tone={KIND_COPY[g.kind].tone}>{String(g.rows.length)}</Pill>
                  </View>
                  <Text style={[body, { color: c.grey500 }]}>{KIND_COPY[g.kind].blurb}</Text>
                  <Text style={[body, t.tab, { color: c.grey600, textAlign: "right" }]}>{groupLine(g.rows)}</Text>
                </View>
                <Box>
                  {g.rows.map((r, i) => <CompanyCard key={`${r.kind}:${r.id}`} r={r} first={i === 0} edit={mayEdit && r.hasRecord} />)}
                </Box>
              </View>
            ))}
          </>
        )}

      <Text style={[t.caption, { color: c.grey500, lineHeight: 20 }]}>
        Commission is charged outside this system today and prints as a dash rather than a zero. It fills once a channel manager is connected.
      </Text>
    </Screen>
  );
}

/** One source, as DataTable's phone card draws it: its name, then each column;
    Edit (the owner, an administrator, the GM, where a record stands behind
    the row) in the last line, grey on the phone. */
function CompanyCard({ r, first, edit }: { r: Row; first: boolean; edit: boolean }) {
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Text style={[body, { color: c.ink900, marginBottom: 2 }]}>{r.name}</Text>
      <Line label="Bookings">{String(r.bookings)}</Line>
      <Line label="Room nights">{String(r.roomNights)}</Line>
      <Line label="Revenue">{revenueWords(r)}</Line>
      <Line label="Commission"><Text style={[body, { color: c.grey500 }]}>{commissionWords(r)}</Text></Line>
      <Line label="Owed"><OwedText o={owed(r.openBalance)} /></Line>
      {edit ? (
        <Line label="">
          <View style={{ flexDirection: "row" }}>
            <Btn label="Edit" a11y={`Edit ${r.name}: ${ON_THE_WEBSITE}`} disabled onPress={() => undefined} />
          </View>
        </Line>
      ) : null}
    </View>
  );
}

