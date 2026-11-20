import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { DayEndScreen } from "../../../src/modules/pos/DayEnd";

/* /pos/5EL/day-end: Close restaurant day, the web's /pos/:code/day-end (pages/DayEnd.tsx). */
export default function Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <DayEndScreen hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
