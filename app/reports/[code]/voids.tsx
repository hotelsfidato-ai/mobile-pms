import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Voids } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/voids: the restaurant's voids (the web's /reports/voids). */
export default function VoidsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Voids hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
