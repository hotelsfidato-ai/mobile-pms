import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { TakeWalkIn } from "../../../src/modules/front-desk/TakeWalkIn";

/* /front-desk/5EL/take-walk-in: tonight's empty rooms. */
export default function TakeWalkInRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <TakeWalkIn hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
