import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { BookingSources } from "../../../src/modules/inventory/BookingSources";

/* /inventory/5EL/booking-sources — the web's /h/:code/booking-sources
   (Configuration, and Settings → Lists → Booking sources). */
export default function BookingSourcesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <BookingSources hotel={hotel} role={roleAt(s.who, hotel.code)} scope={s.who.scope} />;
}
