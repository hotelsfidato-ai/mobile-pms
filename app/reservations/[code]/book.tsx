import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { NewBooking } from "../../../src/modules/reservations/NewBooking";

/* /reservations/5EL/book (?room=306&date=2026-10-11 from an empty Calendar cell): the web's /h/:code/book. */
export default function NewBookingRoute() {
  const s = useSession();
  const { code, room, date } = useLocalSearchParams<{ code: string; room?: string; date?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <NewBooking
      key={`${hotel.code}/${room ?? ""}/${date ?? ""}`} hotel={hotel} role={roleAt(s.who, hotel.code)}
      {...(room ? { room } : {})} {...(date ? { date } : {})}
    />
  );
}
