import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Places } from "../../../src/modules/inventory/Places";

/* /inventory/5EL/places — Places and suppliers, the web's /h/:code/places
   (Store and equipment). Who may change them is the server's answer, sent
   with the read. */
export default function PlacesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Places hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
