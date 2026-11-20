import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Payments } from "../../../src/modules/finance/Payments";

/* Payments for one property (the web's /h/:code/payments): every receipt. */
export default function PaymentsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Payments hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
