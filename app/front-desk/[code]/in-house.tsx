import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { InHouse } from "../../../src/modules/front-desk/InHouse";

/* /front-desk/5EL/in-house · /front-desk/5EL/in-house?view=due-out */
export default function InHouseRoute() {
  const s = useSession();
  const { code, view } = useLocalSearchParams<{ code: string; view?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <InHouse hotel={hotel} role={roleAt(s.who, hotel.code)} view={view} />;
}
