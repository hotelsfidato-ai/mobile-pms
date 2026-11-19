import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Cashiering } from "../../../src/modules/finance/Cashiering";

/* /finance/5EL/cashiering: the drawer this person holds (the web's /h/:code/cashiering). */
export default function CashieringRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Cashiering hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
