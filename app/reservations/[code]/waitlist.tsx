import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Waitlist } from "../../../src/modules/reservations/Waitlist";

/* /reservations/5EL/waitlist: the web's /h/:code/waitlist (the 16 Nov release). */
export default function WaitlistRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Waitlist key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
