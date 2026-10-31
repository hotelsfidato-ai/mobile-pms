import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { ApiError, type Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import type { Stay } from "../../core/types";
import { useRead } from "../../core/ui";
import { CHARGE_CATEGORIES, FROM_LIST, overLimit, rupees, rupeesRound, typed } from "./bill";
import {
  changeRate, openSecondBill, postCharge, readBeforeGst, readChargeList, readCompanies, readRoomRate,
} from "./data";
import { Btn, Choice, Field, Input, ReadyReasons, Refused, Sheet, Tick, type Said } from "./Kit";
import { mayAllowOverLimit } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE BILL'S OWN ACTS — the web's AddChargeDialog, SplitBillButton and
   ChangeRateDialog (FolioPanel.tsx 909-1111, 1563-1648, 713-802). The
   server works the tax out: Add charge shows the rate it will carry and
   no figure of the phone's; Change rate shows the server's split. All
   refused offline in the web's words; nothing is held.
   ══════════════════════════════════════════════════════════════════ */

type Act = { hotel: Hotel; stay: Stay; onClose: () => void; onDone: (said: Said) => void };

export function AddChargeSheet({ hotel, stay, role, onClose, onDone }: Act & { role: string | null }) {
  const code = hotel.code;
  const [category, setCategory] = useState<string>("Food");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [taxable, setTaxable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  /* OVER THE COMPANY'S CREDIT LIMIT (D27-275): the server's sentence; the
     owner, an administrator or the GM may post it with a reason. */
  const [over, setOver] = useState<string | null>(null);
  const [allowReason, setAllowReason] = useState("");
  const mayAllow = mayAllowOverLimit(role);

  const value = typed(amount);
  const listed = useRead(() => readChargeList(code), ["finance", code, "charge-list"]);
  /* THE RATE THIS CHARGE WILL REALLY CARRY, the server's one slab rule. While
     it asks, "…" (QA FI-11); nobody has set one, a dash. */
  const rated = useRead(() => readRoomRate(code, value), ["finance", code, "room-rate", value]);
  const rateText = rated.data ? (rated.data.rate === null ? "-" : `${rated.data.rate}%`) : rated.error ? "not loaded" : "…";

  async function post() {
    setBusy(true);
    setRefused(null);
    try {
      await postCharge(code, stay.id, {
        category, description, amount: value, taxable, businessDate: hotel.businessDate,
        ...(over && allowReason.trim() ? { overLimitReason: allowReason.trim() } : {}),
      });
      onDone({ tone: "ok", title: "Charge posted", text: `On room ${stay.roomNumber}` });
    } catch (e) {
      const said = e instanceof Error ? e.message : "Could not post.";
      if (overLimit(said)) {
        setOver(said);
      } else {
        setRefused(said);
        /* `send` mints a key per call (MFIN-1): no repeat one tap from a lost reply. */
        if (e instanceof ApiError && e.status === 503) setAmount("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title="Post a charge" description={`Room ${stay.roomNumber} · ${stay.guest}`}
      footer={(
        <>
          <Btn kind="ghost" label="Cancel" onPress={onClose} />
          <Btn kind="primary" label={over && mayAllow ? "Allow, with reason" : "Post charge"} busy={busy} off={!description.trim() || !(value > 0)} onPress={() => void post()} />
        </>
      )}
    >
      {listed.data?.length ? (
        <Field label="From the hotel's list">
          <Choice
            label="From the hotel's list" value=""
            options={listed.data.map((i) => ({ value: i.id, label: `${i.name} · ${rupeesRound(i.rate)}` }))}
            onPick={(id) => {
              const pick = listed.data?.find((i) => i.id === id);
              if (!pick) return;
              setDescription(pick.name);
              setAmount(String(pick.rate));
              setCategory(FROM_LIST[pick.category] ?? "Miscellaneous");
            }}
          />
        </Field>
      ) : null}

      <Field label="Category">
        <Choice label="Category" value={category} options={CHARGE_CATEGORIES.map((v) => ({ value: v, label: v }))} onPick={setCategory} />
      </Field>
      <Field label="Description">
        <Input label="Description" value={description} onChange={setDescription} placeholder="Two coffees, room service" />
      </Field>
      <Field label="Amount" hint="Before tax">
        <Input label="Amount" value={amount} onChange={setAmount} keyboard="decimal-pad" placeholder="0" tabular />
      </Field>
      <Tick on={taxable} onChange={setTaxable} label={`Taxable - GST ${rateText}`} />

      {over ? (
        <View style={{ backgroundColor: c.grey50, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, padding: space.card, gap: 8 }}>
          <Text style={[t.label, { color: c.ink900 }]}>{over}</Text>
          {mayAllow ? <Input label="Why it is allowed" value={allowReason} onChange={setAllowReason} placeholder="Why it is allowed" />
            : <Text style={t.label}>The owner, an administrator or the general manager can allow it.</Text>}
        </View>
      ) : null}
      <Refused text={refused} />
    </Sheet>
  );
}

export function SplitSheet({ hotel, stay, onClose, onDone }: Act) {
  const code = hotel.code;
  const companies = useRead(() => readCompanies(code), ["finance", code, "companies"]);
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const list = companies.data ?? [];

  async function open() {
    setBusy(true);
    setRefused(null);
    try {
      await openSecondBill(code, stay.id, companyId);
      onDone({ tone: "ok", title: "Second bill opened", text: "Move charges onto it from the ledger above." });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "Not opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title="Split the bill" description="A second bill on this stay, settled by a company."
      footer={(
        <>
          <Btn kind="ghost" label="Cancel" onPress={onClose} />
          <Btn kind="primary" label="Open the second bill" busy={busy} off={!companyId} onPress={() => void open()} />
        </>
      )}
    >
      {companies.data && list.length === 0 ? (
        <Text style={[t.label, { lineHeight: 20 }]}>No companies are on file yet. Add one under Companies first - a company bill carries their GSTIN and address.</Text>
      ) : (
        <Field label="Who is paying the second bill?" required>
          <Choice label="Who is paying the second bill?" value={companyId} options={list.map((co) => ({ value: co.id, label: co.name }))} onPick={setCompanyId} />
        </Field>
      )}
      <Refused text={companies.error ?? refused} />
    </Sheet>
  );
}

export function ChangeRateSheet({ hotel, stay, onClose, onDone }: Act) {
  const code = hotel.code;
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState("");
  /* "Includes GST" (D27-199): the typed figure is all-in and the SERVER splits it. */
  const [inclusive, setInclusive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const value = typed(rate);
  const split = useQuery({
    queryKey: ["finance", code, "before-gst", value],
    queryFn: () => readBeforeGst(code, value),
    enabled: inclusive && value > 0,
  });
  const s = inclusive && value > 0 ? split.data : undefined;
  const notSplit = s && !s.ok ? s.reason : null;

  async function save() {
    setBusy(true);
    setRefused(null);
    try {
      const res = await changeRate(code, stay.id, { rate: value, reason: reason.trim(), ...(inclusive ? { includesGst: true } : {}) });
      const n = res.data?.corrected ?? 0;
      const said = inclusive && s?.ok ? `${rupees(s.pre)} a night before GST` : `${rupeesRound(value)} a night`;
      onDone({ tone: "ok", title: "Rate changed", text: n === 0 ? `${said}, for every night not yet charged.` : `${said}; ${n} charged ${n === 1 ? "line" : "lines"} corrected.` });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "Rate not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title="Change the rate"
      description={`${stay.guest} · now ${stay.isComplimentary ? "complimentary" : `${rupeesRound(stay.offeredTariff)} a night`}`}
      footer={(
        <>
          <Btn label="Keep it" onPress={onClose} />
          <Btn kind="primary" label="Change the rate" busy={busy} off={!(value > 0) || !reason.trim() || notSplit !== null || (inclusive && !s)} onPress={() => void save()} />
        </>
      )}
    >
      <Field label="New rate a night" required hint={inclusive ? "With GST. It is split by the room's GST slab before it is kept." : "Before tax. The room's GST slab follows it."}>
        <Input label="New rate a night" value={rate} onChange={setRate} keyboard="decimal-pad" tabular />
      </Field>
      <Tick on={inclusive} onChange={setInclusive} label="Includes GST" />
      {s?.ok ? (
        /* The server's three figures as it sent them; the web subtracts them for its GST line. */
        <Text style={t.label}>
          {s.total < value ? `${rupees(value)} can't split exactly: the bill will say ${rupees(s.total)} a night.` : `${rupees(s.pre)} a night before GST, ${rupees(s.total)} with GST (${s.rate}%).`}
        </Text>
      ) : null}
      {notSplit ? <Text style={[t.label, { color: c.yellow800 }]}>{notSplit}</Text> : null}
      <Text style={[t.label, { color: c.grey700, lineHeight: 20 }]}>
        Nights already charged are corrected to it, with this reason - a closed day's on Closed days. Nights still to come are charged at it.
      </Text>
      <Field label="Why" required hint="Kept with every night it corrects.">
        <Input label="Why" value={reason} onChange={setReason} multiline />
      </Field>
      <ReadyReasons code={code} onPick={setReason} />
      <Refused text={refused} />
    </Sheet>
  );
}
