import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Tds } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/tds: TDS on supplier payments (the web's /reports/tds). */
export default function TdsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Tds hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
