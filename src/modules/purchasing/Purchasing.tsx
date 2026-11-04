import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight, Plus, ShieldCheck } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Back, Box, Btn, body, Empty, Loading, NotYours, Segmented, Stale, Toast, type Said } from "../guest-services/kit";
import { Fact, LoadFailed, Note } from "../laundry/kit";
import { Ask } from "./Ask";
import { isRefused, readPurchasing } from "./data";
import { StatePill, useBackInView } from "./kit";
import { askedDay, raisedWords, rupees, STATE_TONE, STATE_WORDS, type PurchaseRequest } from "./purchase";
import { MAY_NOT_ASK, ON_THE_WEBSITE, seesSupplierDues, whyNotAct, whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   PURCHASING on a phone — the web's /h/:code/purchasing
   (src/modules/purchasing/pages/Purchasing.tsx; picture
   pms-shots/all/34-store-and-equipment-purchasing, as dev-gm).
   Somebody asks for what is needed, the general manager approves it (in
   Approvals), an order goes to a supplier on paper, and what arrives lands
   in a store. The list as the web's DataTable draws it at phone width: one
   card a request, its columns as labelled lines, a chevron to the order.

   Restaurant and hotel is this screen. The Bar's bills (D27-354, a photo of
   each bill) and Supplier dues (D27-370, accounts) are the web's other two
   tabs: they stay on the website, said so in their place. "Who may ask"
   (set-up, D18-2) is the web's button for the owner and an administrator:
   here, grey, with the reason.
   ══════════════════════════════════════════════════════════════════ */

type TabName = "hotel" | "bar" | "dues";

/** The web's page line, for each tab. */
const UNDER: Record<TabName, string> = {
  hotel: "Ask for what is needed, get it approved, order it, and receive it into a store.",
  bar: "The bar's bills as they come: the drinks go into the bar's store, with a photo of the bill.",
  dues: "What we owe suppliers: the bills taken on credit and not yet paid.",
};

export function Purchasing({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotRead(role);
  const seesDues = seesSupplierDues(role);
  const [tab, setTab] = useState<TabName>("hotel");
  const [asking, setAsking] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const unsay = useCallback(() => setSaid(null), []);

  const q = useRead(() => (refused ? Promise.resolve(null) : readPurchasing(code)), ["purchasing", code, "list"]);
  useBackInView(["purchasing", code, "list"]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const data = q.data && !isRefused(q.data) ? q.data : null;
  const requests = data?.requests ?? [];
  const mayAsk = whyNotAct(data?.me.mayRaise);
  const open = (r: PurchaseRequest) => router.push(`/purchasing/${code}/${r.id}`);

  /* The gate: the server's one sentence, with nothing above it that cannot work. */
  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Purchasing" action={<Back onPress={onBack} />} />
        <NotYours title="Purchasing" sentence={refused ?? off!} />
      </Screen>
    );
  }

  const askButton = <Btn label="Ask to buy" variant="primary" icon={Plus} disabled={!data || mayAsk != null} onPress={() => setAsking(true)} />;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Purchasing" under={UNDER[tab]} action={<Back onPress={onBack} />} />

        {tab === "hotel" ? (
          <View style={{ gap: 4, marginTop: -4 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {data?.me.maySetRequesters ? <Btn label="Who may ask" icon={ShieldCheck} disabled onPress={() => undefined} /> : null}
              {askButton}
            </View>
            {data?.me.maySetRequesters ? <Text style={[t.caption, { color: c.grey600 }]}>Who may ask: {ON_THE_WEBSITE}</Text> : null}
          </View>
        ) : null}

        <Segmented<TabName>
          label="Which purchases" value={tab} onChange={setTab}
          options={[
            { value: "hotel", label: "Restaurant and hotel" }, { value: "bar", label: "Bar" },
            ...(seesDues ? [{ value: "dues" as const, label: "Supplier dues" }] : []),
          ]}
        />

        {tab === "bar" ? (
          <Note title={`The bar's bills: ${ON_THE_WEBSITE}`}>
            Recording a bar bill takes a photo of it, which this phone app cannot do yet. Record and read the bar's bills on the website.
          </Note>
        ) : tab === "dues" ? (
          <Note title={`Supplier dues: ${ON_THE_WEBSITE}`}>
            Paying a supplier, a credit note and a reversal are the accounts' work, done on the website.
          </Note>
        ) : (
          <>
            {/* RULE 6: somebody the setting leaves out is told, and told whom to ask. */}
            {data && mayAsk ? <Note>{MAY_NOT_ASK}</Note> : null}
            {data && data.stores.length === 0 ? (
              <Note>
                This property has no store switched on, so there is nowhere for a delivery to land. Add or switch one on in Places and suppliers first.
              </Note>
            ) : null}

            {data === null ? (
              q.error ? (
                <LoadFailed
                  title="Purchasing did not load" error={q.error} onRetry={q.reload}
                  offline="This device is offline, so purchasing cannot load. It loads by itself as soon as the connection is back."
                />
              ) : <Loading words="Reading purchasing…" />
            ) : requests.length === 0 ? (
              <Box style={{ paddingBottom: 24, alignItems: "center" }}>
                <Empty
                  title="Nothing has been asked for yet"
                  description={"A purchase starts here: what is needed, how much of it, which store it is for, and why. The "
                    + "general manager approves it, the order goes to a supplier on paper, and what arrives lands in that store."}
                />
                {mayAsk ? null : <Btn label="Ask to buy something" variant="primary" onPress={() => setAsking(true)} />}
              </Box>
            ) : (
              <>
                <Stale error={q.error} />
                <Box>
                  {requests.map((r, i) => (
                    <Pressable
                      key={r.id} onPress={() => open(r)} accessibilityRole="button"
                      accessibilityLabel={`${r.reference}, ${STATE_WORDS[r.state]}, ${r.reason}`}
                      style={({ pressed }) => ({
                        minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12,
                        borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent",
                        borderTopLeftRadius: i === 0 ? 12 : 0, borderTopRightRadius: i === 0 ? 12 : 0,
                      })}
                    >
                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <Text style={[body, { color: c.ink900, marginBottom: 2 }]}>{r.reference}</Text>
                        <Fact label="State"><StatePill tone={STATE_TONE[r.state]}>{STATE_WORDS[r.state]}</StatePill></Fact>
                        <Fact label="What for"><Text style={[body, { color: c.grey600 }]}>{r.reason}</Text></Fact>
                        <Fact label="Deliver to">{r.store.name}</Fact>
                        {/* Chosen when the order goes out: none before, a dash, not a guess. */}
                        <Fact label="Supplier">{r.supplier?.name ?? "-"}</Fact>
                        <Fact label="Items">{String(r.lines)}</Fact>
                        <Fact label="Total">
                          {/* An order with a line unpriced has NO total: a dash, grey. */}
                          <Text style={[body, t.tab, { color: r.total === null ? c.grey500 : c.ink900 }]}>{rupees(r.total)}</Text>
                        </Fact>
                        <Fact label="Asked by">{r.requestedBy ?? "-"}</Fact>
                        <Fact label="Asked">{askedDay(r)}</Fact>
                      </View>
                      <ChevronRight size={16} color={c.grey400} />
                    </Pressable>
                  ))}
                </Box>
              </>
            )}
          </>
        )}
      </Screen>

      {asking && data ? (
        <Ask
          code={code} data={data} onClose={() => setAsking(false)}
          onAsked={(r) => {
            /* The dialog closes and the list changes: the end of the act (the web, MEMORY 291). */
            setAsking(false);
            void cache.invalidateQueries({ queryKey: ["purchasing", code] });
            void cache.invalidateQueries({ queryKey: ["approvals", code] });
            setSaid({ title: raisedWords(r), tone: "ok" });
          }}
        />
      ) : null}
      <Toast said={said} onClose={unsay} />
    </View>
  );
}
