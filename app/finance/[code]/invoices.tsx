import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Invoices } from "../../../src/modules/finance/Invoices";

/* Invoices for one property (the web's /h/:code/invoices): ready to bill, and every number issued. */
export default function InvoicesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Invoices hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
