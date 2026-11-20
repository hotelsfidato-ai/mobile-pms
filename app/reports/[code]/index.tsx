import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { ReportsIndex } from "../../../src/modules/reports/ReportsIndex";

/* /reports/5EL: All reports, at one property (the web's /reports). */
export default function ReportsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <ReportsIndex hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
