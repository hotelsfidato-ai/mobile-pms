import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { RoomTypes } from "../../../src/modules/inventory/RoomTypes";

/* /inventory/5EL/room-types — Room types, the web's Settings → Rooms → Room
   types (/settings/rooms/room-types; /h/:code/room-types redirects there). */
export default function RoomTypesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <RoomTypes hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
