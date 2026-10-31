import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/core/session";
import { WalkIns } from "../../../src/modules/front-desk/WalkIns";

/* /front-desk/5EL/walk-ins: the record of walk-ins. */
export default function WalkInsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <WalkIns hotel={hotel} />;
}
