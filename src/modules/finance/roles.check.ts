/* Run: node --experimental-strip-types mobile/src/modules/finance/roles.check.ts
   Who may read, charge, pay, change, invoice, edit and check out: each
   refusal the API gave, word for word (read back 17 Oct, MODULE.md). */
import {
  mayAllowOverLimit, whyNotChange, whyNotCharge, whyNotCheckOut, whyNotEdit, whyNotInvoice, whyNotPay,
  whyNotReadBill, whyNotReversePayment,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* As dev-housekeeping, dev-finance and dev-desk heard them. */
eq(whyNotReadBill("housekeeping"), "Reading bills is for the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer. Ask one of them.", "housekeeping reads a bill");
eq(whyNotPay("housekeeping"), "Taking a payment is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "housekeeping pays");
eq(whyNotCharge("housekeeping"), "Adding to a bill is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "housekeeping charges");
eq(whyNotChange("housekeeping"), "Changing a bill is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "housekeeping reverses");
eq(whyNotInvoice("housekeeping"), "Issuing a tax invoice is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "housekeeping invoices");
eq(whyNotCheckOut("finance"), "Checking a guest out is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "the accountant checks out");
eq(whyNotEdit("front_desk"), "Editing a charge on a bill is for the owner, an administrator or the general manager. Ask one of them.", "reception edits");
eq(whyNotReversePayment("front_desk"), "Reversing a payment is for the owner, an administrator, the general manager or the accountant. Ask one of them.", "reception reverses a payment");

for (const role of ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance"]) {
  eq([whyNotPay(role), whyNotCharge(role), whyNotChange(role), whyNotInvoice(role), whyNotReadBill(role)], [null, null, null, null, null], `${role} at the bill`);
}
for (const role of ["owner", "gm", "hotel_manager", "front_desk"]) eq(whyNotCheckOut(role), null, `${role} checks out`);
for (const role of ["owner", "admin", "gm"]) eq([whyNotEdit(role), mayAllowOverLimit(role)], [null, true], `${role} edits`);
for (const role of ["owner", "gm", "finance"]) eq(whyNotReversePayment(role), null, `${role} reverses a payment`);
eq(whyNotReadBill("read_only"), null, "a viewer reads");
for (const role of ["read_only", "revenue_manager", "kitchen_manager", "chef", "pos", "stores", null]) {
  eq(whyNotPay(role) != null && whyNotCheckOut(role) != null, true, `${role} may not pay or check out`);
}
for (const role of ["hotel_manager", "front_desk", "finance", null]) eq(mayAllowOverLimit(role), false, `${role} allows over the limit`);

console.log("finance roles: all checks pass");
