import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { GstSales } from "../../../src/modules/reports/MoneyLists";

/* /reports/5EL/gst-sales: the GST sales register (the web's /reports/gst-sales). */
export default function GstSalesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <GstSales hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
