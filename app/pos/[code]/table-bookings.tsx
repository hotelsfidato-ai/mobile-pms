import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { TableBookingsScreen } from "../../../src/modules/pos/TableBookings";

/* /pos/5EL/table-bookings: Table bookings, the web's /pos/:code/table-bookings (pages/TableBookings.tsx). */
export default function Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <TableBookingsScreen hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
