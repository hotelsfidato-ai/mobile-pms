import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Outlook } from "../../../src/modules/revenue-management/Outlook";

/* /revenue/5EL: the Revenue outlook for one property (the web's /h/:code/revenue-outlook). */
export default function RevenueOutlookRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Outlook hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
