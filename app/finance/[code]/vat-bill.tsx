import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { VatBillDoc } from "../../../src/modules/finance/InvoiceDoc";

/* One document (the web's /h/:code/invoices/vat/<number>). The number carries slashes
   (5EL/2026-27/00001), so it rides as ?number=, never a catch-all segment:
   the gate's route check reads only lower-case [segments] (MEMORY 10). */
export default function VatBillRoute() {
  const s = useSession();
  const { code, number } = useLocalSearchParams<{ code: string; number?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  if (!number) return <Redirect href={`/finance/${hotel.code}/invoices`} />;
  return <VatBillDoc hotel={hotel} number={number} role={roleAt(s.who, hotel.code)} />;
}
