import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Commission } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/commission: commission owed (the web's /reports/commission). */
export default function CommissionRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Commission hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
