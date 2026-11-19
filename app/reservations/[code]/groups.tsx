import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/core/session";
import { Groups } from "../../../src/modules/reservations/Groups";

/* /reservations/5EL/groups: the web's /h/:code/groups, Groups. */
export default function GroupsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Groups key={hotel.code} hotel={hotel} />;
}
