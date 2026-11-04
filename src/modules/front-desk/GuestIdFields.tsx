import { Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import {
  GENDERS, guestIdState, ID_TYPES, PERSON, PURPOSES, requiredKeys, VISIT, type GuestId, type Particulars, type Spec,
} from "./guestId";
import { body, Box, Field, Pick, Toggle } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   THE GUEST'S ID, ASKED ONCE — the web's GuestIdFields.tsx and
   ForeignGuestFields.tsx (Form III, D27-25) on a phone. The same boxes in
   the same order for the check-in, a walk-in and another adult in the room.
   A date is typed YYYY-MM-DD: no date-picker package (M-7), and a birth
   date is too far for the day stepper; the server's rule checks each one.
   ══════════════════════════════════════════════════════════════════ */

const NOT_RECORDED = { value: "", label: "Not recorded" };

function FormIII({ value, onChange, nationality, idCaptured, nothingRequired }: {
  value: Particulars; onChange: (p: Particulars) => void; nationality: string; idCaptured: boolean; nothingRequired: boolean;
}) {
  const required = new Set(nothingRequired ? [] : requiredKeys(nationality, idCaptured));
  const box = ([key, label, kind]: Spec) => {
    if (key === "purposeOther" && value["purpose"] !== "others") return null;
    const set = (v: string) => onChange({ ...value, [key]: v });
    const on = value[key] ?? "";
    return (
      <Field key={key} label={label} required={required.has(key)}>
        {kind === "gender" || kind === "purpose" || kind === "yesno" ? (
          <Pick
            value={on} onChange={set} title={label}
            options={[NOT_RECORDED, ...(kind === "gender" ? GENDERS : kind === "purpose" ? PURPOSES : [["yes", "Yes"], ["no", "No"]] as const)
              .map(([v, l]) => ({ value: v, label: l }))]}
          />
        ) : (
          <Box value={on} onChange={set} label={label} placeholder={kind === "date" ? "YYYY-MM-DD" : undefined} keyboard={kind === "tel" ? "phone-pad" : undefined} />
        )}
      </Field>
    );
  };
  return (
    <View style={{ gap: 16, borderLeftWidth: 2, borderLeftColor: "#ffb600", paddingLeft: 14 }}>
      <Text style={t.caption}>
        {"Form III goes to the FRRO portal within 24 hours of arrival, and the departure within 24 hours of leaving. "}
        {nothingRequired ? "Fill in what you have; the rest can be completed later from the Form III register."
          : "Starred fields are needed now; the rest can be completed later from the Form III register."}
      </Text>
      {PERSON.map(box)}
      <Text style={[t.label, { color: c.ink900 }]}>This visit</Text>
      {VISIT.map(box)}
    </View>
  );
}

export function GuestIdFields({ value, onChange, today, idsOff, withDocument = true, companion = false }: {
  value: GuestId; onChange: (next: GuestId) => void; today: string;
  /** The IDs this hotel does not take (192): one already chosen stays. */
  idsOff: string[];
  /** False for a booking that does not arrive today: only the nationality. */
  withDocument?: boolean;
  /** Another adult in the room (D27-382): nothing here holds up the check-in. */
  companion?: boolean;
}) {
  const set = (patch: Partial<GuestId>) => onChange({ ...value, ...patch });
  const s = guestIdState(value, today);
  return (
    <View style={{ gap: 16 }}>
      <Field label="Nationality" hint="Two letters, IN for India. Anything else puts the stay on the Form III register.">
        <View style={{ width: 96 }}>
          <Box value={value.nationality} label="Nationality" placeholder="IN" max={2} upper onChange={(v) => set({ nationality: v.toUpperCase() })} />
        </View>
      </Field>

      {!withDocument ? (
        s.foreign ? <Text style={[t.label, body, { color: c.yellow800 }]}>A foreign guest: their Form III is due at check-in.</Text> : null
      ) : (
        <>
          <Field label="Document">
            <Pick
              value={value.idType} onChange={(idType) => set({ idType })} title="Document"
              options={[NOT_RECORDED, ...ID_TYPES.filter(([v]) => v === value.idType || !idsOff.includes(v)).map(([v, l]) => ({ value: v, label: l }))]}
            />
          </Field>
          <Field label="Number" required={Boolean(value.idType)}>
            <Box value={value.idNumber} label="Number" disabled={!value.idType} onChange={(idNumber) => set({ idNumber })}
              placeholder={value.idType === "passport" ? "P1234567" : "Document number"} />
          </Field>
          {!s.captured && !companion ? (
            <Field label="Reason for skipping" required>
              <Box value={value.idSkipReason} label="Reason for skipping" placeholder="Scanner offline - to be captured at breakfast" onChange={(idSkipReason) => set({ idSkipReason })} />
            </Field>
          ) : null}
          {/* Only for a foreign national: asking an Indian guest for a visa
              number teaches people to leave fields blank. */}
          {s.foreign ? (
            <FormIII value={value.particulars} onChange={(particulars) => set({ particulars })} nationality={value.nationality} idCaptured={s.captured} nothingRequired={companion} />
          ) : null}
          {s.formIII.length > 0 ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Form III still needs: ${s.formIII.join(", ")}.`}</Text> : null}
          {s.wrong ? <Text style={[t.label, face[500], { color: c.red700 }]}>{s.wrong}</Text> : null}
          {s.expired.length > 0 ? (
            companion ? <Text style={[t.label, body, { color: c.yellow800 }]}>{`${s.expired.join(" ")} It is recorded as typed.`}</Text>
              : <Toggle value={value.expiredOk} onChange={(expiredOk) => set({ expiredOk })} label="Check in anyway" description={`${s.expired.join(" ")} It is recorded as typed.`} />
          ) : null}
        </>
      )}
    </View>
  );
}
