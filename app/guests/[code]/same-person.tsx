import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { SamePerson } from "../../../src/modules/guests/SamePerson";

/* Possible same person (the web's /crm/same-person, read for the property in view). mobile/m13-sales. */
export default function SamePersonRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <SamePerson key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
