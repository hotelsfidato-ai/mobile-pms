import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CityLedger } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/city-ledger: the city ledger (the web's /reports/city-ledger). */
export default function CityLedgerRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CityLedger hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
