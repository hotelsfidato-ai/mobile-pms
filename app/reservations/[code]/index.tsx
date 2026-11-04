import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/core/session";
import { AllBookings } from "../../../src/modules/reservations/AllBookings";

/* /reservations/5EL: the web's /h/:code/reservations, All bookings. */
export default function AllBookingsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <AllBookings key={hotel.code} hotel={hotel} />;
}
