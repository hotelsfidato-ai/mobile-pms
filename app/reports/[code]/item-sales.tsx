import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { ItemSales } from "../../../src/modules/reports/OpsReport";

/* /reports/5EL/item-sales: Item sales for one property (the web's /reports/item-sales). */
export default function Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <ItemSales hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
