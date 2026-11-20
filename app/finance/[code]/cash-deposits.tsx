import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CashDeposits } from "../../../src/modules/finance/CashDeposits";

/* /finance/5EL/cash-deposits: each day's cash to deposit (the web's /h/:code/cash-deposits). */
export default function CashDepositsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CashDeposits hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
