import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { DuesByAge } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/dues-by-age: money owed by age (the web's /reports/dues-by-age). */
export default function DuesByAgeRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <DuesByAge hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
