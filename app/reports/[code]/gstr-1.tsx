import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Gstr1 } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/gstr-1: GSTR-1 (the web's /reports/gstr-1). */
export default function Gstr1Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Gstr1 hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
