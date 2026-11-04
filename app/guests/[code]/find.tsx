import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Find } from "../../../src/modules/guests/Find";

/* Guest 360's search (the web's /crm/guests), from one property. */
export default function FindRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Find key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
