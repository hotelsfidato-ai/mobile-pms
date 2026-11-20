import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronLeft, Plus, RotateCw } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { notKnown, Screen, useRead, useScreenStop } from "../../core/ui";
import { PageHead, Pill } from "../front-desk/kit";
import { body, Btn, Failed, NotYours, Stale, Toast, type Said } from "../guest-services/kit";
import { Blank, Panel } from "../leads/kit";
import { isRefused, readCompanyContracts } from "./data";
import { AllotmentDialog, CompanyDialog, ContractDialog } from "./Dialogs";
import { whyNotChangeAllotment, whyNotChangeCompany, whyNotContracts, whyNotHold, whyNotSetContract } from "./roles";
import {
  addressWords, allotmentHead, allotmentNights, allotmentRate, BOOK_ON_WEB, commissionWords, creditLine, discountWords, heldLine,
  inForce, KIND_LABEL, leftIn, NO_CONTRACT, priceWords, releaseLine, typeName, validWords,
  type Allotment, type CompanyContracts, type Contract,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   ONE COMPANY on a phone — the web's /contracts/:companyId
   (src/modules/contracts/pages/CompanyContracts.tsx; not pictured).
   mobile/m13-sales.

   Its record and its contracts at this hotel, each with its prices (as
   typed, paise kept; not agreed is a dash) and the rooms held under it.
   Edit company, Add contract, Edit, Hold rooms and Change are the
   keepers' (the owner, an administrator, the GM: C-6); anyone else sees
   them greyed with the API's sentence once, under the head (the web hides
   them). Book from it is on the website for now (the phone's New booking
   does not read an allotment). The business date is the server's `today`.

   AN OUTCOME NOBODY KNOWS (MCON-1, MEMORY 16): a sheet hands its moment up
   here, and every write on this page greys with "Not known whether …"
   until a read of the company made after that moment has landed without
   an error (rules.ts stillUnknown) - a sheet closed and opened again
   cannot hold the rooms a second time.
   ══════════════════════════════════════════════════════════════════ */

type Open = { kind: "company" } | { kind: "contract"; k?: Contract } | { kind: "hold"; k: Contract; a?: Allotment };

export function Company({ hotel, role, id }: { hotel: Hotel; role: string | null; id: string }) {
  const code = hotel.code;
  const refusedRead = whyNotContracts(role);
  const notKeeper = whyNotChangeCompany(role);
  const keeper = notKeeper === null;
  const cache = useQueryClient();
  /* The page's stop (MCON-1, MCON-U1): kept by name outside this page, so leaving the company and coming
     back lets nothing go; let go only by a read of the company that BEGAN after the loss. */
  /* A company is the GROUP's record, read at any of its hotels (the review): the name carries no hotel. */
  const cstop = useScreenStop(`contracts/company/${id}`);
  const q = useRead(cstop.watch(() => (refusedRead ? Promise.resolve(null) : readCompanyContracts(code, id))), ["contracts", code, "company", id]);
  const [open, setOpen] = useState<Open | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* The words of the last unknown write; after a remount, the general words. */
  const [said_, setUnknown] = useState<{ title: string; line: string } | null>(null);
  const unknown = said_ ?? notKnown("made", "the company's contracts and allotments");
  const blocked = cstop.stuck;
  /** Why a write is grey now: the API's sentence for a role that may not, else the unknown outcome's line. */
  const stop = (why: string | null) => (why ?? (blocked ? unknown.line : null));
  const onUnknown = (title: string, line: string, e: unknown) => { cstop.stop(e); setUnknown({ title, line }); };
  const refused = isRefused(q.data) ? q.data.refused : null;
  const data = q.data && !isRefused(q.data) ? q.data : null;
  /* Every write, and every close (an outcome nobody knows), reads the company again; Companies and agents too. */
  const reread = () => { void cache.invalidateQueries({ queryKey: ["contracts", code] }); void cache.invalidateQueries({ queryKey: ["guests", code] }); };
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/contracts/${code}`));
  const crumb = (
    <Pressable onPress={back} accessibilityRole="link" accessibilityLabel="Back to Contracts" hitSlop={8}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
      <ChevronLeft size={16} color={c.orange700} />
      <Text style={[t.label, { color: c.orange700 }]}>Contracts</Text>
    </Pressable>
  );

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        {crumb}
        <NotYours title="Contracts" sentence={refusedRead ?? refused!} />
      </Screen>
    );
  }
  if (q.data === null && !q.loading && !q.error && !refusedRead) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        {crumb}
        <Panel flush><Blank compact title="No such company" line="It is not on the list any more. Open it again from Contracts." /></Panel>
      </Screen>
    );
  }

  const done = (s: Said) => { setOpen(null); setSaid(s); reread(); };
  const openIf = (o: Open) => { if (!blocked) setOpen(o); };
  const close = () => { setOpen(null); reread(); };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        {crumb}
        {data === null ? (
          q.error ? <Failed title="This company could not be read." error={q.error} onRetry={q.reload} />
            : <Panel><ActivityIndicator color={c.orange} accessibilityLabel="Reading the company" /></Panel>
        ) : (
          <>
            <PageHead title={data.company.name} pill={<Pill tone="neutral">{KIND_LABEL[data.company.kind]}</Pill>}>
              <View style={{ gap: 4 }}>
                <Btn label="Add contract" variant="primary" icon={Plus} a11y={stop(whyNotSetContract(role)) ? `Add contract. ${stop(whyNotSetContract(role))}` : "Add contract"}
                  disabled={stop(whyNotSetContract(role)) !== null} onPress={() => openIf({ kind: "contract" })} style={{ alignSelf: "flex-start" }} />
                {stop(whyNotSetContract(role)) ? <Text style={[t.caption, { color: c.grey600 }]}>{stop(whyNotSetContract(role))}</Text> : null}
              </View>
            </PageHead>
            {cstop.unknown ? (
              <View accessibilityRole="alert" style={{ padding: 12, gap: 8, borderRadius: 12, backgroundColor: c.red50 }}>
                <Text style={[t.label, { color: c.red700, ...face[600] }]}>{unknown.title}</Text>
                <Text style={[t.caption, { color: c.grey700, lineHeight: 17 }]}>{unknown.line}</Text>
                <Btn label="Read the company again" icon={RotateCw} onPress={q.reload} style={{ alignSelf: "flex-start" }} />
              </View>
            ) : null}
            <Stale error={q.error} />
            <CompanyCard data={data} why={stop(notKeeper)} onEdit={() => openIf({ kind: "company" })} />
            {data.contracts.length === 0 ? (
              <Panel flush><Blank compact title={NO_CONTRACT.title} line={NO_CONTRACT.line} /></Panel>
            ) : data.contracts.map((k) => (
              <ContractCard key={k.id} k={k} data={data} stop={stop} role={role}
                onEdit={() => openIf({ kind: "contract", k })} onHold={(a) => openIf({ kind: "hold", k, ...(a ? { a } : {}) })} />
            ))}
          </>
        )}
      </Screen>
      {data && open?.kind === "company" ? (
        <CompanyDialog code={code} company={data.company} keeper={keeper} onClose={close} onDone={(s) => done(s)} onUnknown={onUnknown} />
      ) : null}
      {data && open?.kind === "contract" ? (
        <ContractDialog code={code} data={data} {...(open.k ? { contract: open.k } : {})} onClose={close} onDone={done} onUnknown={onUnknown} />
      ) : null}
      {data && open?.kind === "hold" ? (
        <AllotmentDialog code={code} data={data} contract={open.k} {...(open.a ? { allotment: open.a } : {})} onClose={close} onDone={done} onUnknown={onUnknown} />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function CompanyCard({ data, why, onEdit }: { data: CompanyContracts; why: string | null; onEdit: () => void }) {
  const co = data.company;
  return (
    <Panel title="Company" action={<Btn label="Edit company" a11y={why ? `Edit company. ${why}` : "Edit company"} disabled={why !== null} onPress={onEdit} />}>
      <Detail label="GSTIN"><Text style={[body, t.tab, { color: c.ink900 }]}>{co.gstin ?? "-"}</Text></Detail>
      <Detail label="Billing address"><Text style={[body, { color: c.ink900 }]}>{addressWords(co)}</Text></Detail>
      <Detail label="Contact">
        {/* A phone or an email opens the dialler or mail (docs/NATIVE.md). */}
        {!co.contactName && !co.phone && !co.email ? <Text style={[body, { color: c.ink900 }]}>-</Text> : (
          <Text style={[body, { color: c.ink900 }]}>
            {[co.contactName && <Text key="n">{co.contactName}</Text>,
              co.phone && <Text key="p" accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${co.phone}`)} style={{ color: c.orange700 }}>{co.phone}</Text>,
              co.email && <Text key="e" accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${co.email}`)} style={{ color: c.orange700 }}>{co.email}</Text>]
              .filter(Boolean).flatMap((x, i) => (i === 0 ? [x] : [" · ", x]))}
          </Text>
        )}
      </Detail>
      <Detail label="Credit"><Text style={[body, t.tab, { color: c.ink900 }]}>{creditLine(co)}</Text></Detail>
    </Panel>
  );
}

/** DetailList's row on a phone: the label over its value. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[t.label, { color: c.grey500 }]}>{label}</Text>
      {children}
    </View>
  );
}

function ContractCard({ k, data, stop, role, onEdit, onHold }: {
  k: Contract; data: CompanyContracts; stop: (why: string | null) => string | null; role: string | null;
  onEdit: () => void; onHold: (a?: Allotment) => void;
}) {
  const mine = data.allotments.filter((a) => a.contractId === k.id);
  const stillRunning = data.today <= k.validTo;
  const why = stop(whyNotSetContract(role));
  const whyHold = stop(whyNotHold(role));
  const whyChange = stop(whyNotChangeAllotment(role));
  return (
    <Panel
      title={(
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">{k.name}</Text>
          {inForce(k, data.today) ? <Pill tone="success">In force</Pill> : null}
        </View>
      )}
      description={validWords(k)}
      action={<Btn label="Edit" a11y={why ? `Edit ${k.name}. ${why}` : `Edit ${k.name}`} disabled={why !== null} onPress={onEdit} />}
      flush
    >
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }}>
        {k.pricing === "discount" ? <Text style={[body, { color: c.ink900 }]}>{discountWords(k)}</Text> : (
          <View>
            <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
              {["Room", "Plan", "Single", "Double"].map((h, i) => (
                <Text key={h} style={[t.caption, { flex: i === 0 ? 2 : 1, textAlign: i > 1 ? "right" : "left", ...face[500] }]}>{h}</Text>
              ))}
            </View>
            {k.rates.map((r) => (
              <View key={`${r.roomTypeId}|${r.mealPlan}`} style={{ flexDirection: "row", gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                <Text style={[body, { flex: 2, color: c.ink900 }]}>{typeName(data, r.roomTypeId)}</Text>
                <Text style={[body, { flex: 1, color: c.ink900 }]}>{r.mealPlan}</Text>
                <Text style={[body, t.tab, { flex: 1, textAlign: "right", color: c.ink900 }]}>{priceWords(r.single)}</Text>
                <Text style={[body, t.tab, { flex: 1, textAlign: "right", color: c.ink900 }]}>{priceWords(r.double)}</Text>
              </View>
            ))}
          </View>
        )}
        {data.company.kind === "travel_agent" ? <Text style={[body, { color: c.grey600 }]}>{commissionWords(k)}</Text> : null}
        {k.notes ? <Text style={[body, { color: c.grey600 }]}>{k.notes}</Text> : null}
      </View>
      {mine.length > 0 || stillRunning ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[t.label, { flex: 1, color: c.ink900, ...face[600] }]} accessibilityRole="header">Allotments</Text>
            {stillRunning ? (
              <Btn label="Hold rooms" a11y={whyHold ? `Hold rooms. ${whyHold}` : "Hold rooms"} disabled={whyHold !== null} onPress={() => onHold()} />
            ) : null}
          </View>
          {mine.length === 0 ? <Text style={[body, { color: c.grey600 }]}>No rooms held under this contract.</Text> : mine.map((a, i) => {
            const left = leftIn(a, data.today);
            return (
              <View key={a.id} style={{ gap: 4, paddingTop: i === 0 ? 0 : 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                <Text style={[body, { color: c.ink900, ...face[500] }]}>{allotmentHead(a)}</Text>
                <Text style={[body, t.tab, { color: c.grey600 }]}>{allotmentNights(a)}</Text>
                <Text style={[body, { color: c.grey600 }]}>{releaseLine(a, data.today)}</Text>
                <Text style={[body, t.tab, { color: c.grey700 }]}>{heldLine(a, data.today)}</Text>
                <Text style={[body, { color: c.grey600 }]}>Rate: <Text style={t.tab}>{allotmentRate(a, k)}</Text></Text>
                {a.notes ? <Text style={[body, { color: c.grey600 }]}>{a.notes}</Text> : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                  {left !== null && left > 0 ? <Btn label="Book from it" a11y={`Book from it. ${BOOK_ON_WEB}`} disabled onPress={() => undefined} /> : null}
                  <Btn label="Change" a11y={whyChange ? `Change. ${whyChange}` : `Change the ${a.roomType} allotment`} disabled={whyChange !== null} onPress={() => onHold(a)} />
                </View>
                {left !== null && left > 0 ? <Text style={[t.caption, { color: c.grey500 }]}>{BOOK_ON_WEB}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Panel>
  );
}
