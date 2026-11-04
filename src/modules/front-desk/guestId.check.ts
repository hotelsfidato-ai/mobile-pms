/* Run: node --experimental-strip-types mobile/src/modules/front-desk/guestId.check.ts
   The ID and Form III rules the check-in asks before Check in, as the web
   and the server word them (validate.ts, ForeignGuestFields.tsx, GuestIdFields.tsx). */
import {
  aadhaarProblem, countProblem, countryProblem, deskGuestId, documentDatesProblem, emailProblem, expiredDocuments,
  formIIIMissing, guestIdPayload, guestIdState, idNumberProblem, noGuestId, phoneProblem,
} from "./guestId.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const today = "2026-10-17";

/* Phones and emails (X-2). */
eq(phoneProblem("+91 98765 43210"), null, "an Indian mobile");
eq(phoneProblem("abc"), "\"abc\" is not a phone number. Type 10 to 15 digits, e.g. +91 98765 43210.", "letters");
eq(phoneProblem("9999999999") != null, true, "all one digit");
eq(phoneProblem(""), null, "blank is the caller's question");
eq(emailProblem("a@b.co"), null, "an email");
eq(emailProblem("a@b") != null, true, "no dot");

/* Aadhaar: twelve digits, UIDAI's check digit (the PMS tests' own numbers). */
eq(aadhaarProblem("2345 6789 0124"), null, "a good Aadhaar");
eq(aadhaarProblem("234567890123"), "That Aadhaar number is not right - a digit is mistyped. Check it against the card.", "a mistyped digit");
eq(aadhaarProblem("12ab"), "An Aadhaar number is 12 digits and does not start with 0 or 1.", "12ab");
eq(idNumberProblem("passport", "A1234567"), null, "a passport");
eq(idNumberProblem("passport", "A1"), "A passport number is 6 to 15 letters and digits, e.g. A1234567.", "a short passport");
eq(idNumberProblem("voter", "AB1"), "A document number is 4 to 40 characters.", "a short voter ID");

/* Dates on documents, and expired ones (warned, not refused). */
eq(documentDatesProblem({ dateOfBirth: "2030-01-01" }, today), "The date of birth is in the future.", "born tomorrow");
eq(documentDatesProblem({ passportIssuedOn: "2020-01-01", passportExpiry: "2019-01-01" }, today), "The passport expires before it was issued.", "expires first");
eq(documentDatesProblem({ visaExpiry: "2026-02-30" }, today), "The visa's expiry date is not a date.", "30 February");
eq(expiredDocuments({ visaExpiry: "2026-10-16" }, today), ["The visa expired on 2026-10-16."], "an expired visa");
eq(countryProblem("ZZ"), "\"ZZ\" is not a country code. Type the two letters, e.g. IN, GB or US.", "ZZ");
eq(countryProblem("gb"), null, "gb");
eq(countProblem(0, "Adults", 1), "Adults is a whole number from 1 to 99.", "no adults");
eq(countProblem(Number("abc"), "Children", 0), "Children is a whole number from 0 to 99.", "abc children");

/* Form III: a foreign guest's required boxes; Nepal and Bhutan need no visa. */
eq(formIIIMissing({}, "GB", true), ["Visa or OCI number", "Visa type", "Phone in India", "Arrived from", "Purpose of visit", "Previous place of stay"], "a British guest");
eq(formIIIMissing({}, "NP", true), ["Phone in India", "Arrived from", "Purpose of visit", "Previous place of stay"], "a Nepali guest");
eq(formIIIMissing({}, "GB", false), ["Phone in India", "Arrived from", "Purpose of visit", "Previous place of stay"], "ID skipped: no visa asked");
eq(formIIIMissing({}, "IN", true), [], "an Indian guest");

/* The state the one Check in reads, in the web's order. */
eq(guestIdState(noGuestId(), today).blocked, "Record the ID document - type and number - or give a reason for skipping it.", "nothing typed");
eq(guestIdState({ ...noGuestId(), idSkipReason: "Scanner offline" }, today).blocked, null, "skipped with a reason");
eq(guestIdState({ ...noGuestId(), idType: "aadhaar", idNumber: "2345 6789 0124" }, today).blocked, null, "an Aadhaar recorded");
const visitor = { ...noGuestId("GB"), idType: "passport", idNumber: "A1234567" };
eq(guestIdState(visitor, today).blocked, "Form III still needs: Visa or OCI number, Visa type, Phone in India, Arrived from, Purpose of visit, Previous place of stay.", "a British guest, nothing else");
const filled = { ...visitor, particulars: { visaNumber: "V1", visaType: "e-Tourist", phoneInIndia: "+91 98765 43210", arrivedFrom: "Mumbai", purpose: "tourism", previousStay: "Goa", visaExpiry: "2026-10-01" } };
eq(guestIdState(filled, today).blocked, "The document has expired: say whether to check in anyway.", "expired visa");
eq(guestIdState({ ...filled, expiredOk: true }, today).blocked, null, "expired, checked in anyway");

/* The body: the nationality always, the document only when captured, Form III's visit for a foreigner. */
eq(guestIdPayload({ ...noGuestId(), idSkipReason: "later" }), { identity: { nationality: "IN" }, idSkipReason: "later" }, "skipped");
eq(guestIdPayload(filled).visit, { phoneInIndia: "+91 98765 43210", arrivedFrom: "Mumbai", previousStay: "Goa", purpose: "tourism" }, "the visit's half");
eq((guestIdPayload(filled).identity as Record<string, string>)["visaNumber"], "V1", "the person's half");

/* The hotel's defaults: its ID type only for a guest of its own nationality. */
eq(deskGuestId({ defaultNationality: "IN", defaultIdType: "aadhaar" }).idType, "aadhaar", "an Indian guest starts on Aadhaar");
eq(deskGuestId({ defaultNationality: "IN", defaultIdType: "aadhaar" }, "US").idType, "", "never an Aadhaar from abroad");

console.log("front-desk guest ID: all checks pass");
