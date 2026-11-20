import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { RoomChargesScreen } from "../../../src/modules/pos/RoomCharges";

/* /pos/5EL/room-charges: Charges to rooms, the web's /pos/:code/room-charges (pages/Pos.tsx). */
export default function Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <RoomChargesScreen hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
