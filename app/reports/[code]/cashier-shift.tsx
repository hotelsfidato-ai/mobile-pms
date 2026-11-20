import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CashierShift } from "../../../src/modules/reports/MoneyLists";

/* /reports/5EL/cashier-shift: the cashier shift (the web's /reports/cashier-shift). */
export default function CashierShiftRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CashierShift hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
