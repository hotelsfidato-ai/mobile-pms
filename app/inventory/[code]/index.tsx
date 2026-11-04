import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Rates } from "../../../src/modules/inventory/Rates";

/* /inventory/5EL — Rates, the web's /h/:code/rates (and /pricing, /grids,
   /rate-plans, which open it). */
export default function RatesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Rates hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
