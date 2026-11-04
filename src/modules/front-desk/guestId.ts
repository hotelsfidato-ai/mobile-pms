/* ══════════════════════════════════════════════════════════════════
   THE GUEST'S ID AND FORM III, ASKED AT CHECK-IN — the web's, ported so
   the clerk hears a refusal before pressing Check in. The server is the
   rule and refuses independently (api/src/modules/front-desk/operations.ts,
   api/src/modules/guests/formIII.ts):
     api/src/validate.ts                       phoneProblem, emailProblem,
       aadhaarProblem (Verhoeff), idNumberProblem, documentDatesProblem,
       expiredDocuments, countryProblem, dateProblem, countProblem
     src/modules/guests/components/ForeignGuestFields.tsx   Form III's
       boxes, requiredKeys, formIIIMissing, idProblem, particularsPayload
     src/modules/guests/components/GuestIdFields.tsx        GuestId,
       noGuestId, deskGuestId, guestIdState, guestIdPayload
   Pure: no React Native here, so `guestId.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

type Text = string | null | undefined;
const blank = (v: Text): v is null | undefined | "" => !v?.trim();

/* ── validate.ts ─────────────────────────────────────────────────── */

export function phoneProblem(phone: Text): string | null {
  if (blank(phone)) return null;
  const p = phone.trim();
  const digits = p.replace(/\D/g, "");
  return /^\+?[\d\s()-]+$/.test(p) && digits.length >= 10 && digits.length <= 15 && !/^(\d)\1*$/.test(digits)
    ? null
    : `"${p}" is not a phone number. Type 10 to 15 digits, e.g. +91 98765 43210.`;
}

export function emailProblem(email: Text): string | null {
  if (blank(email)) return null;
  const e = email.trim();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : `"${e}" is not an email address, e.g. name@example.com.`;
}

const D = ["0123456789", "1234067895", "2340178956", "3401289567", "4012395678",
  "5987604321", "6598710432", "7659821043", "8765932104", "9876543210"];
const P = ["0123456789", "1576283094", "5803796142", "8916043527", "9453126870",
  "4286573901", "2793806415", "7046913258"];
function verhoeffOk(digits: string): boolean {
  let c = 0;
  [...digits].reverse().forEach((d, i) => { c = Number(D[c]![Number(P[i % 8]![Number(d)])]); });
  return c === 0;
}

export function aadhaarProblem(number: Text): string | null {
  if (blank(number)) return null;
  const n = number.replace(/\s/g, "");
  if (!/^[2-9]\d{11}$/.test(n)) return "An Aadhaar number is 12 digits and does not start with 0 or 1.";
  return verhoeffOk(n) ? null : "That Aadhaar number is not right - a digit is mistyped. Check it against the card.";
}

export function idNumberProblem(type: Text, number: Text): string | null {
  if (blank(number)) return null;
  const n = number.trim();
  if (type === "aadhaar") return aadhaarProblem(n);
  if (type === "passport") return /^[A-Za-z0-9]{6,15}$/.test(n) ? null : "A passport number is 6 to 15 letters and digits, e.g. A1234567.";
  return n.length >= 4 && n.length <= 40 ? null : "A document number is 4 to 40 characters.";
}

export function dateProblem(value: Text): string | null {
  if (blank(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Choose a date.";
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? null : `${value} is not a date.`;
}

export function documentDatesProblem(doc: Record<string, Text>, today: string): string | null {
  for (const [value, what] of [
    [doc["dateOfBirth"], "date of birth"], [doc["passportIssuedOn"], "passport's issue date"],
    [doc["visaIssuedOn"], "visa's issue date"], [doc["passportExpiry"], "passport's expiry date"],
    [doc["visaExpiry"], "visa's expiry date"],
  ] as const) {
    if (!blank(value) && dateProblem(value)) return `The ${what} is not a date.`;
  }
  const dob = doc["dateOfBirth"], pIn = doc["passportIssuedOn"], pOut = doc["passportExpiry"];
  const vIn = doc["visaIssuedOn"], vOut = doc["visaExpiry"];
  if (!blank(dob) && dob > today) return "The date of birth is in the future.";
  if (!blank(pIn) && pIn > today) return "The passport's issue date is in the future.";
  if (!blank(vIn) && vIn > today) return "The visa's issue date is in the future.";
  if (!blank(pIn) && !blank(pOut) && pOut < pIn) return "The passport expires before it was issued.";
  if (!blank(vIn) && !blank(vOut) && vOut < vIn) return "The visa expires before it was issued.";
  return null;
}

export function expiredDocuments(doc: Record<string, Text>, onDate: string): string[] {
  const p = doc["passportExpiry"], v = doc["visaExpiry"];
  return [
    ...(!blank(p) && p < onDate ? [`The passport expired on ${p}.`] : []),
    ...(!blank(v) && v < onDate ? [`The visa expired on ${v}.`] : []),
  ];
}

const COUNTRIES = new Set((
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR "
  + "BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ "
  + "EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW "
  + "GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY "
  + "KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV "
  + "MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY "
  + "QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG "
  + "TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM "
  + "ZW XK").split(" "));

export function countryProblem(code: Text): string | null {
  if (blank(code)) return null;
  const c = code.trim().toUpperCase();
  return COUNTRIES.has(c) ? null : `"${c}" is not a country code. Type the two letters, e.g. IN, GB or US.`;
}

/** Typed as text on a phone ("abc" stays "abc", FD-8): a whole number from min to max. */
export function countProblem(value: unknown, what: string, min: number, max = 99): string | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? null
    : `${what} is a whole number from ${min} to ${max}.`;
}

/* ── Form III (ForeignGuestFields.tsx) ───────────────────────────── */

export const PURPOSES = [
  ["tourism", "Tourism"], ["business", "Business"], ["employment", "Employment"],
  ["medical", "Medical"], ["student", "Student"], ["conference", "Conference"], ["others", "Others"],
] as const;
/** gd_id_type_valid (013). */
export const ID_TYPES = [
  ["passport", "Passport"], ["aadhaar", "Aadhaar"], ["driving_licence", "Driving licence"], ["voter", "Voter ID"], ["other", "Other"],
] as const;
export const GENDERS = [["female", "Female"], ["male", "Male"], ["transgender", "Transgender"]] as const;

export type Kind = "text" | "date" | "tel" | "gender" | "purpose" | "yesno";
export type Spec = readonly [key: string, label: string, kind: Kind];

export const PERSON: Spec[] = [
  ["visaNumber", "Visa or OCI number", "text"], ["visaType", "Visa type", "text"],
  ["phoneInIndia", "Phone in India", "tel"], ["mobileInIndia", "Mobile in India", "tel"],
  ["phoneAbroad", "Phone outside India", "tel"], ["mobileAbroad", "Mobile outside India", "tel"],
  ["gender", "Gender", "gender"], ["dateOfBirth", "Date of birth", "date"],
  ["passportIssuedOn", "Passport issued on", "date"], ["passportIssuePlace", "Passport issued at", "text"],
  ["passportIssueCountry", "Passport issuing country", "text"], ["passportExpiry", "Passport expiry", "date"],
  ["visaIssuedOn", "Visa issued on", "date"], ["visaIssuePlace", "Visa issued at", "text"],
  ["visaIssueCountry", "Visa issuing country", "text"], ["visaExpiry", "Visa expiry", "date"],
  ["addressLine", "Address abroad", "text"], ["city", "City abroad", "text"], ["country", "Country abroad", "text"],
];
export const VISIT: Spec[] = [
  ["arrivedFrom", "Arrived from", "text"], ["previousStay", "Previous place of stay", "text"],
  ["purpose", "Purpose of visit", "purpose"], ["purposeOther", "Other purpose", "text"],
  ["arrivedInIndiaOn", "Arrived in India on", "date"], ["arrivalPort", "Port of arrival in India", "text"],
  ["employedInIndia", "Employed in India", "yesno"], ["refAddress", "Reference address in India", "text"],
  ["refCity", "Reference city", "text"], ["refState", "Reference state", "text"],
  ["refPincode", "Reference PIN code", "text"], ["remarks", "Remarks", "text"],
];
const CONTACTS = ["phoneInIndia", "mobileInIndia", "phoneAbroad", "mobileAbroad"];
const IDENTITY_KEYS = PERSON.map(([k]) => k).filter((k) => !CONTACTS.includes(k));

export type Particulars = Record<string, string>;

/** What the law's Form III needs now: a Nepali or Bhutanese citizen needs no
    visa; an ID skipped for a reason takes its visa with it. */
export function requiredKeys(nationality: string, idCaptured: boolean): string[] {
  const code = nationality.trim().toUpperCase() || "IN";
  if (code === "IN") return [];
  return [
    ...(idCaptured && code !== "NP" && code !== "BT" ? ["visaNumber", "visaType"] : []),
    "phoneInIndia", "arrivedFrom", "purpose", "previousStay",
  ];
}

export function formIIIMissing(p: Particulars, nationality: string, idCaptured: boolean): string[] {
  const label = new Map([...PERSON, ...VISIT].map(([k, l]) => [k, l]));
  return requiredKeys(nationality, idCaptured).filter((k) => !p[k]?.trim()).map((k) => label.get(k)!);
}

export function idProblem(p: Particulars, idType: string, idNumber: string, nationality: string, today: string): string | null {
  return idNumberProblem(idType, idNumber) ?? documentDatesProblem(p, today) ?? countryProblem(nationality)
    ?? phoneProblem(p["phoneInIndia"]) ?? phoneProblem(p["mobileInIndia"])
    ?? phoneProblem(p["phoneAbroad"]) ?? phoneProblem(p["mobileAbroad"]);
}

export function particularsPayload(p: Particulars) {
  const pick = (keys: string[]) => Object.fromEntries(keys.filter((k) => p[k]?.trim()).map((k) => [k, p[k]!.trim()]));
  const visitKeys = [...CONTACTS, "nextDestination", ...VISIT.map(([k]) => k).filter((k) => k !== "employedInIndia")];
  return {
    identity: pick(IDENTITY_KEYS),
    visit: { ...pick(visitKeys), ...(p["employedInIndia"] ? { employedInIndia: p["employedInIndia"] === "yes" } : {}) },
  };
}

/* ── GuestIdFields.tsx ───────────────────────────────────────────── */

export interface GuestId {
  nationality: string;
  idType: string;
  idNumber: string;
  idSkipReason: string;
  particulars: Particulars;
  /** An expired passport or visa, and the desk said "check in anyway" (GU-2). */
  expiredOk: boolean;
}

export const noGuestId = (nationality = "IN"): GuestId => ({
  nationality, idType: "", idNumber: "", idSkipReason: "", particulars: {}, expiredOk: false,
});

/** Started on the hotel's defaults (D27-243 3.6): never an Aadhaar for a guest from abroad. */
export const deskGuestId = (
  rules?: { defaultNationality: string; defaultIdType: string | null } | null,
  nationality?: string | null,
): GuestId => {
  const home = rules?.defaultNationality ?? "IN";
  const n = nationality ?? home;
  return { ...noGuestId(n), idType: n === home ? rules?.defaultIdType ?? "" : "" };
};

/** What the boxes say, and the one reason a check-in cannot go yet (null when it can). */
export function guestIdState(id: GuestId, today: string) {
  const captured = Boolean(id.idType && id.idNumber.trim());
  const foreign = (id.nationality.trim().toUpperCase() || "IN") !== "IN";
  const wrong = idProblem(id.particulars, id.idType, id.idNumber, id.nationality, today);
  const formIII = foreign ? formIIIMissing(id.particulars, id.nationality, captured) : [];
  const expired = foreign ? expiredDocuments(id.particulars, today) : [];
  const blocked =
    !captured && !id.idSkipReason.trim()
      ? "Record the ID document - type and number - or give a reason for skipping it."
      : wrong
        ?? (formIII.length > 0 ? `Form III still needs: ${formIII.join(", ")}.` : null)
        ?? (expired.length > 0 && !id.expiredOk ? "The document has expired: say whether to check in anyway." : null);
  return { captured, foreign, wrong, formIII, expired, blocked };
}

/** The check-in call's fields: the nationality always, the document only when captured. */
export function guestIdPayload(id: GuestId) {
  const { captured, foreign } = guestIdState(id, "");
  const p = particularsPayload(id.particulars);
  return {
    identity: {
      nationality: id.nationality,
      ...(captured ? { idType: id.idType, idNumber: id.idNumber.trim(), ...p.identity } : {}),
    },
    ...(foreign ? { visit: p.visit } : {}),
    idSkipReason: id.idSkipReason,
  };
}

/** "Same as the guest" (D27-386): the lead's visit answers over a companion's,
    only what the lead has. Their phones and document stay their own. */
export function sameVisit(to: Particulars, lead: Record<string, string | null | undefined>): Particulars {
  const next = { ...to };
  for (const [k] of VISIT) { const v = lead[k]; if (v) next[k] = v; }
  return next;
}
