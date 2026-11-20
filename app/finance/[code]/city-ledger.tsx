import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CityLedger } from "../../../src/modules/finance/CityLedger";

/* /finance/5EL/city-ledger: the companies and booking sites that owe the hotel (the web's /h/:code/city-ledger, Company accounts). */
export default function CityLedgerRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CityLedger hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
