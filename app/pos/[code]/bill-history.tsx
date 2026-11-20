import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { BillHistoryScreen } from "../../../src/modules/pos/BillHistory";

/* /pos/5EL/bill-history: Bill history, the web's /pos/:code/bill-history (pages/BillHistory.tsx). */
export default function Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <BillHistoryScreen hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
