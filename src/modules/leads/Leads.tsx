import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, ExternalLink, MessageCircle, PlugZap, RotateCw } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen } from "../../core/ui";
import { Pill } from "../front-desk/kit";
import { body, Btn, Failed, NotYours } from "../guest-services/kit";
import { isRefused, readConversation, readLeads } from "./data";
import { Blank, Exports, Panel } from "./kit";
import { BOOK_ON_WEB, whyNotLeads } from "./roles";
import {
  channelWord, chipsOf, emptyOf, leadLine, leadsTable, leadTitle, messageFoot, messageWords, NEXT_FAILED, NO_CONTACT, NO_MESSAGES,
  NOT_CONNECTED, NOT_IN_APP, NOT_READ, sentenceOf, showingWords, shownOf, statusWord, TITLE, toneOf, UNDER, valueWords, when,
  type Lead, type LeadsPage,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   LEADS AND WHATSAPP on a phone — the web's /h/:code/leads
   (src/modules/leads/pages/Leads.tsx; picture pms-shots/new/n-h-leads,
   dev-gm, "Not connected yet"). mobile/m13-sales.

   The leads app's enquiries for this property, read live as the screen
   opens, 50 at a time ("Show older enquiries"), never on a timer or on
   coming back (each read counts against the leads app's free allowance).
   The chips filter what was read; tapping an enquiry opens it in place of
   the list (the web's phone view), its conversation read only then.
   NOTHING HERE WRITES OR SENDS: staff reply in the leads app ("Reply in
   the leads app" opens it in the phone's browser), and Book this lead is
   on the website for now (the phone's New booking does not read a lead).
   ══════════════════════════════════════════════════════════════════ */

type Read = LeadsPage | { refused: string };
const status = (e: unknown) => (e instanceof ApiError ? e.status : undefined);
const words = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function Leads({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotLeads(role);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<Lead | null>(null);
  const [pulled, setPulled] = useState(false);

  const q = useInfiniteQuery({
    queryKey: ["leads", code],
    queryFn: ({ pageParam }): Promise<Read> => readLeads(code, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: Read) => (isRefused(last) ? null : last.more),
    enabled: refusedRead === null,
    /* Every load is a read of the leads app: never on focus, never on a timer (the web's). */
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const first = q.data?.pages[0];
  const refused = first && isRefused(first) ? first.refused : null;
  const page = first && !isRefused(first) ? first : null;
  const leads = useMemo(() => (q.data?.pages ?? []).flatMap((p) => (isRefused(p) ? [] : p.leads)), [q.data]);
  const shown = shownOf(leads, filter);
  const live = page?.connected === true && page.inApp;

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={() => void q.refetch()}>
        <Head title={TITLE} under={UNDER} />
        <NotYours title={TITLE} sentence={refusedRead ?? refused!} />
      </Screen>
    );
  }

  const failure = q.error;
  const top = (
    <>
      <Head title={TITLE} under={UNDER} />
      <Exports role={role} holds="guests" table={live ? leadsTable(shown, showingWords(filter)) : null} />
    </>
  );

  let content;
  if (q.isPending) content = <Panel><ActivityIndicator color={c.orange} accessibilityLabel="Reading the leads" /></Panel>;
  else if (failure && !page) {
    const sentence = sentenceOf(status(failure), words(failure));
    content = sentence
      ? <Panel flush><Blank icon={PlugZap} title={NOT_READ} line={sentence} /></Panel>
      : <Failed title="Could not read the leads" error={words(failure)} onRetry={() => void q.refetch()} />;
  } else if (page && !page.connected) {
    content = <Panel flush><Blank icon={PlugZap} title={NOT_CONNECTED.title} line={NOT_CONNECTED.line} /></Panel>;
  } else if (page && !page.inApp) {
    content = <Panel flush><Blank icon={MessageCircle} title={NOT_IN_APP.title} line={NOT_IN_APP.line} /></Panel>;
  } else if (open) {
    content = <LeadPanel code={code} lead={open} onBack={() => setOpen(null)} />;
  } else {
    const empty = emptyOf(leads.length === 0);
    content = (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist" accessibilityLabel="Show leads by status">
          {chipsOf(leads).map((ch) => {
            const on = filter === ch.key;
            return (
              <Pressable
                key={ch.key} onPress={() => setFilter(ch.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                accessibilityLabel={`${ch.label} ${ch.n}`} android_ripple={{ color: c.grey200 }}
                style={({ pressed }) => ({
                  minHeight: 44, paddingHorizontal: 14, borderRadius: 8, justifyContent: "center", overflow: "hidden",
                  backgroundColor: on ? c.ink900 : pressed && Platform.OS === "ios" ? c.grey50 : c.white,
                  borderWidth: on ? 0 : 1, borderColor: c.grey200,
                })}
              >
                <Text style={[t.label, t.tab, { color: on ? c.white : c.grey700 }]}>
                  {ch.label} <Text style={{ color: on ? c.onNavy : c.grey500 }}>{ch.n}</Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Panel title="Enquiries" description="Newest message first" flush>
          {shown.length === 0 ? <Blank compact title={empty.title} line={empty.line} /> : shown.map((l, i) => (
            <Pressable
              key={l.ref} onPress={() => setOpen(l)} accessibilityRole="button" accessibilityLabel={`Open the enquiry from ${leadTitle(l)}`}
              android_ripple={{ color: c.grey200 }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "flex-start", gap: 12, minHeight: 56, paddingHorizontal: space.cardX, paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100, backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white,
              })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text numberOfLines={1} style={[t.label, { flexShrink: 1, color: c.ink900, ...face[600] }]}>{leadTitle(l)}</Text>
                  <Pill tone={toneOf(l.status)}>{statusWord(l.status)}</Pill>
                </View>
                <Text numberOfLines={1} style={[body, { color: c.grey600 }]}>{l.lastMessage ?? "-"}</Text>
                <Text style={t.caption}>{channelWord(l.channel)}</Text>
              </View>
              <Text style={[t.caption, t.tab]}>{when(l.lastMessageAt)}</Text>
            </Pressable>
          ))}
          {q.hasNextPage ? (
            <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <Btn label={q.isFetchingNextPage ? "Reading" : "Show older enquiries"} disabled={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} style={{ alignSelf: "flex-start" }} />
            </View>
          ) : null}
          {failure && page ? (
            <Text style={[body, { color: c.grey600, paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }]}>
              {sentenceOf(status(failure), words(failure)) ?? NEXT_FAILED}
            </Text>
          ) : null}
        </Panel>
      </>
    );
  }

  return (
    <Screen refreshing={pulled && q.isRefetching} onRefresh={() => { setPulled(true); void q.refetch(); }}>
      {top}
      {content}
    </Screen>
  );
}

function LeadPanel({ code, lead, onBack }: { code: string; lead: Lead; onBack: () => void }) {
  const q = useQuery({
    queryKey: ["leads", code, "lead", lead.ref],
    queryFn: () => readConversation(code, lead.ref),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const failure = q.error;
  const said = failure ? sentenceOf(status(failure), words(failure)) : null;
  return (
    <Panel title={leadTitle(lead)} description={leadLine(lead)} action={<Pill tone={toneOf(lead.status)}>{statusWord(lead.status)}</Pill>}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
        <ArrowLeft size={16} color={c.grey700} />
        <Text style={[t.label, { color: c.grey700 }]}>Back to the enquiries</Text>
      </Pressable>

      {/* On a phone each label sits over its value (the web's Breathing Room). */}
      <View style={{ gap: 8 }}>
        <Stack label="Came in" value={when(lead.receivedAt)} />
        {lead.status === "BOOKED" ? (
          <>
            <Stack label="Booking in the leads app" value={lead.bookingRef ?? "-"} />
            <Stack label="Value typed there" value={valueWords(lead.bookingValue)} />
          </>
        ) : null}
      </View>
      {lead.doNotContact ? (
        <Text style={[body, { color: c.grey700, backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }]}>{NO_CONTACT}</Text>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ gap: 4 }}>
          <Btn label="Book this lead" a11y={`Book this lead. ${BOOK_ON_WEB}`} variant="primary" icon={CalendarPlus} disabled onPress={() => undefined} />
          <Text style={[t.caption, { color: c.grey500 }]}>{BOOK_ON_WEB}</Text>
        </View>
        {q.data?.replyUrl ? (
          <Btn label="Reply in the leads app" icon={ExternalLink} onPress={() => void Linking.openURL(q.data!.replyUrl!)} />
        ) : null}
      </View>

      <View accessibilityLabel="The conversation" style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 16, gap: 8 }}>
        {q.isPending ? <ActivityIndicator color={c.orange} accessibilityLabel="Reading the conversation" />
          : failure ? (said
            ? <Text style={[body, { color: c.grey600 }]}>{said}</Text>
            : (
              <View style={{ gap: 8 }}>
                <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{`Could not read the conversation. ${words(failure)}`}</Text>
                <Btn label="Try again" icon={RotateCw} onPress={() => void q.refetch()} style={{ alignSelf: "flex-start" }} />
              </View>
            ))
            : !q.data || q.data.messages.length === 0
              ? <Text style={[body, { color: c.grey500 }]}>{NO_MESSAGES}</Text>
              : q.data.messages.map((m, i) => (
                <View key={i} style={{
                  maxWidth: "85%", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
                  alignSelf: m.direction === "in" ? "flex-start" : "flex-end",
                  backgroundColor: m.direction === "in" ? c.grey50 : c.info50, borderColor: m.direction === "in" ? c.grey200 : c.info100,
                }}>
                  <Text style={[body, { color: c.ink900 }]}>{messageWords(m)}</Text>
                  <Text style={[t.caption, t.tab, { marginTop: 4 }]}>{messageFoot(m)}</Text>
                </View>
              ))}
      </View>
    </Panel>
  );
}

/** A label over its value (the web's dl on a phone). */
function Stack({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[t.label, { color: c.grey500 }]}>{label}</Text>
      <Text style={[body, t.tab, { color: c.grey700 }]}>{value}</Text>
    </View>
  );
}

