import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Calendar } from "../../../src/modules/reservations/Calendar";

/* /reservations/5EL/calendar: the web's /h/:code/calendar, the fortnight's chart. */
export default function CalendarRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  /* The person's Room type / Floor, kept on the server (087); the core's scope does not name it yet. */
  const grouping = (s.who.scope as { roomGrouping?: "type" | "floor" }).roomGrouping;
  return <Calendar key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} grouping={grouping} />;
}
