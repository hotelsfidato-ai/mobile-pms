import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Accounting } from "../../../src/modules/reports/MoneyAccounting";

/* /reports/5EL/accounting: the accounting export (the web's /reports/accounting). */
export default function AccountingRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Accounting hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
