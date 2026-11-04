import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CrsBookingsScreen } from "../../../src/modules/crs/Bookings";

/* CRS bookings for one property (the web's /h/:code/crs-bookings). */
export default function CrsBookingsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CrsBookingsScreen key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
