import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { Head, Screen, s as core, keys, notKnown, useRead } from "../../core/ui";
import { getBankDetails, removeBankDetails, setBankDetails } from "./data";
import { Btn, Failed, Field, Labelled, Loading, Refused, Sheet, Stale, Toast, body, confirm, saidOf, useAct, useSaid, useStop, type Said, type Stop } from "./kit";
import { refusedScreen } from "./roles";
import { dateTime, type BankDetails } from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   BANK DETAILS on a phone — Settings → Money → Bank details (console.
   settings.ts BankSettings: components/VoucherSettings.tsx BankDetailsCard,
   the owner's D27-215). Printed on this hotel's booking voucher when set.
   Seen and changed by whoever manages the hotel (app.manages_hotel: its
   owner, GM or Admin, or a group administrator; GET and PUT/DELETE
   /:code/bank-details) - the server's refusal is its own sentence. Every
   change is told to the group owner's bell (D27-216), and the card says
   so before it is pressed. Remove asks first (the phone's own dialog;
   the web removes at one tap). Refused offline. Not pictured.
   ══════════════════════════════════════════════════════════════════ */

const BLANK = { accountName: "", accountNumber: "", bankName: "", branch: "", ifsc: "", upi: "" };

export function Bank({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedScreen(role, "settings");
  const { said, say, close } = useSaid();
  const [editing, setEditing] = useState(false);
  const [pulled, setPulled] = useState(false);
  const key = ["admin", code, "bank-details"];
  const [seenAt, setSeenAt] = useState(0);
  const q = useRead(async () => {
    if (refused) return null;
    const started = Date.now();
    const answer = await getBankDetails(code);
    setSeenAt(started);
    return answer;
  }, key);
  /* The sheet's stop, kept here so closing it does not free it (MADM-3). */
  const stop = useStop(seenAt);
  const refresh = () => void cache.invalidateQueries({ queryKey: key });
  const bank = q.data?.bank ?? null;
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Bank details" under={hotel.name} />
        {refused ? <Refused sentence={refused} /> : (
          <View style={[core.card, { gap: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={t.heading}>Bank details</Text>
                <Text style={[body, { color: c.grey500 }]}>The group's owner is told whenever they change.</Text>
                <Text style={[t.caption, { lineHeight: 17 }]}>Printed on this hotel's booking voucher. With none set, the voucher prints no bank details.</Text>
              </View>
              {q.data ? <Btn label={bank ? "Change" : "Set bank details"} disabled={stop.stuck} onPress={() => setEditing(true)} /> : null}
            </View>
            {q.data === undefined ? (q.error ? <Failed title="Could not read the bank details" error={q.error} onRetry={q.reload} /> : <Loading what="the bank details" />)
              : !bank ? <Text style={[body, { color: c.grey500 }]}>None set.</Text> : (
                <>
                  <Stale error={q.error} />
                  <Labelled label="Account name" value={bank.accountName} />
                  <Labelled label="Account no." value={bank.accountNumber} />
                  <Labelled label="Bank" value={bank.bankName} />
                  <Labelled label="Branch" value={bank.branch ?? "-"} />
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1 }}><Labelled label="IFSC" value={bank.ifsc} /></View>
                    <View style={{ flex: 1 }}><Labelled label="UPI ID" value={bank.upi ?? "-"} /></View>
                  </View>
                  <Text style={t.caption}>{`Last changed${bank.changedBy ? ` by ${bank.changedBy}` : ""} on ${dateTime(bank.changedAt)}.`}</Text>
                </>
              )}
          </View>
        )}
      </Screen>
      {editing ? <Edit stop={stop} code={code} bank={bank} onSaid={say} onClose={() => { setEditing(false); refresh(); }} /> : null}
      <Toast said={said} onClose={close} />
    </View>
  );
}

function Edit({ stop, code, bank, onSaid, onClose }: { stop: Stop; code: string; bank: BankDetails | null; onSaid: (s: Said) => void; onClose: () => void }) {
  const act = useAct(undefined, stop);
  const [form, setForm] = useState(bank
    ? { accountName: bank.accountName, accountNumber: bank.accountNumber, bankName: bank.bankName, branch: bank.branch ?? "", ifsc: bank.ifsc, upi: bank.upi ?? "" }
    : BLANK);
  const put = (k: keyof typeof BLANK, upper = false) => (v: string) => setForm((f) => ({ ...f, [k]: upper ? v.toUpperCase() : v }));
  const save = () => act.run(() => setBankDetails(code, form), {
    ok: () => { onSaid({ title: "Bank details saved", body: "They print on this hotel's booking vouchers from now on.", tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not saved")),
    unknown: (e) => onSaid({ ...notKnown("saved", "the bank details", e), tone: "bad" }),
  });
  const remove = async () => {
    if (act.busy || act.stuck) return;
    if (!(await confirm("Remove the bank details?", "The voucher prints no bank details. The group's owner is told of this change.", "Remove"))) return;
    await act.run(() => removeBankDetails(code), {
      ok: () => { onSaid({ title: "Bank details removed", body: "The voucher prints no bank details.", tone: "ok" }); onClose(); },
      no: (e) => onSaid(saidOf(e, "Not removed")),
      unknown: (e) => onSaid({ ...notKnown("removed", "the bank details", e), tone: "bad" }),
    });
  };
  const off = act.busy || act.stuck;
  return (
    <Sheet open title="Bank details" onClose={onClose} closable={!act.busy}
      description="As they should print on the booking voucher. The group's owner is told of this change."
      footer={<>
        {bank ? <Btn variant="ghost" label="Remove" disabled={off} onPress={() => void remove()} /> : null}
        <Btn label="Cancel" onPress={onClose} disabled={act.busy} grow />
        <Btn variant="primary" label={act.busy ? "…" : "Save"} disabled={off} onPress={() => void save()} grow />
      </>}>
      <Field label="Account name" required hint="The name the account is in." maxLength={100} value={form.accountName} onChangeText={put("accountName")} autoCapitalize="words" />
      <Field label="Account number" required hint="Digits only, 9 to 18 of them." input={keys.count} value={form.accountNumber} onChangeText={put("accountNumber")} />
      <Field label="Bank" required maxLength={100} value={form.bankName} onChangeText={put("bankName")} autoCapitalize="words" />
      <Field label="Branch" maxLength={100} value={form.branch} onChangeText={put("branch")} autoCapitalize="words" />
      <Field label="IFSC" required hint="Eleven characters, the fifth a zero." maxLength={11} input={keys.code} value={form.ifsc} onChangeText={put("ifsc", true)} />
      <Field label="UPI ID" hint="If guests may pay to one: name@bank." input={keys.email} value={form.upi} onChangeText={put("upi")} />
      {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("saved", "the bank details").line} Close this to read them again.</Text> : null}
    </Sheet>
  );
}
