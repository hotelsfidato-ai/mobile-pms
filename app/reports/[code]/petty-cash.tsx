import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { PettyCash } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/petty-cash: the petty cash book (the web's /reports/petty-cash). */
export default function PettyCashRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <PettyCash hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
